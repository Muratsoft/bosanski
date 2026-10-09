import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LangVariant } from '@prisma/client';

export type AiChatInput = {
  message: string;
  level: string;
  variant: LangVariant;
  lessonContext?: string;
  history: { role: 'user' | 'assistant'; content: string }[];
};

@Injectable()
export class AiProvider {
  private readonly logger = new Logger(AiProvider.name);

  constructor(private readonly config: ConfigService) {}

  async chat(input: AiChatInput): Promise<string> {
    const openaiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (openaiKey) {
      try {
        return await this.chatOpenAi(openaiKey, input);
      } catch (err) {
        this.logger.warn(
          `OpenAI hata, fallback: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    const geminiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (geminiKey) {
      try {
        return await this.chatGemini(geminiKey, input);
      } catch (err) {
        this.logger.warn(
          `Gemini hata, fallback: ${err instanceof Error ? err.message : err}`,
        );
        return this.offlineTutor(input, { providerConfigured: true });
      }
    }

    return this.offlineTutor(input, { providerConfigured: false });
  }

  private systemPrompt(input: AiChatInput) {
    const variantLabel: Record<string, string> = {
      COMMON: 'ortak BCS (Boşnakça/Sırpça/Hırvatça/Karadağça)',
      BS: 'Boşnakça',
      HR: 'Hırvatça',
      SR: 'Sırpça',
      CNR: 'Karadağça',
    };

    return [
      'Sen Türkçe konuşan öğrencilere BCS dilleri öğreten sabırlı bir dil öğretmenisin.',
      `Seviye: ${input.level}. Varyant: ${variantLabel[input.variant] || input.variant}.`,
      'Açıklamaları Türkçe yap; örnek cümleleri hedef dilde ver ve altına Türkçe çevirisini yaz.',
      'Kısa, net ve pratik ol. Telaffuz ipuçlarını Latin harflerle ver.',
      'Varyant farkı varsa (ör. hljeb/kruh/hleb) belirt.',
      input.lessonContext
        ? `Ders bağlamı:\n${input.lessonContext.slice(0, 2500)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async chatOpenAi(apiKey: string, input: AiChatInput) {
    const model =
      this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    const messages = [
      { role: 'system', content: this.systemPrompt(input) },
      ...input.history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: input.message },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('OpenAI boş yanıt');
    return content;
  }

  private geminiModelCandidates(): string[] {
    const preferred =
      this.config.get<string>('GEMINI_MODEL')?.trim() ||
      'gemini-flash-lite-latest';
    const fallbacks = [
      'gemini-flash-lite-latest',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
    ];
    return [...new Set([preferred, ...fallbacks])];
  }

  private async chatGemini(apiKey: string, input: AiChatInput) {
    const contents = [
      ...input.history.map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: input.message }] },
    ];
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: this.systemPrompt(input) }] },
      contents,
      generationConfig: { temperature: 0.4 },
    });

    let lastError: Error | null = null;
    for (const model of this.geminiModelCandidates()) {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          return await this.chatGeminiOnce(apiKey, model, body);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          lastError = err instanceof Error ? err : new Error(message);
          const transient = /Gemini (429|503)/.test(message);
          this.logger.warn(
            `Gemini ${model} deneme ${attempt}/3: ${message.slice(0, 160)}`,
          );
          if (transient && attempt < 3) {
            await new Promise((r) => setTimeout(r, 400 * attempt));
            continue;
          }
          break;
        }
      }
    }

    throw lastError ?? new Error('Gemini yanıt veremedi');
  }

  private async chatGeminiOnce(apiKey: string, model: string, body: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const content = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('')
      .trim();
    if (!content) throw new Error('Gemini boş yanıt');
    this.logger.log(`Gemini yanıtı model=${model}`);
    return content;
  }

  /**
   * API anahtarı yokken veya sağlayıcı geçici hata verince yerel öğretmen.
   */
  private offlineTutor(
    input: AiChatInput,
    opts: { providerConfigured: boolean },
  ): string {
    const footer = opts.providerConfigured
      ? `_Seviye ${input.level} · ${input.variant} (Gemini geçici yoğun/hatalı — yerel yedek yanıt)._`
      : `_Seviye ${input.level} · ${input.variant} (yerel öğretmen — OPENAI_API_KEY veya GEMINI_API_KEY ekleyince gerçek model açılır)._`;
    const q = input.message.toLocaleLowerCase('tr-TR');
    const phrases: { keys: string[]; answer: string }[] = [
      {
        keys: ['merhaba', 'selam', 'zdravo'],
        answer: [
          '**Zdravo** — samimi “merhaba”.',
          '**Dobar dan** — “iyi günler” (daha resmi).',
          '',
          'Örnek:',
          '- Zdravo, kako si? → Merhaba, nasılsın?',
          '- Dobar dan, drago mi je. → İyi günler, memnun oldum.',
        ].join('\n'),
      },
      {
        keys: ['teşekkür', 'hvala'],
        answer: [
          '**Hvala** — teşekkürler.',
          '**Hvala lijepa** — çok teşekkürler.',
          '**Nema na čemu** — bir şey değil.',
          '',
          'Örnek: Hvala na pomoći. → Yardımın için teşekkürler.',
        ].join('\n'),
      },
      {
        keys: ['kahve', 'kafa', 'kafu', 'kafe'],
        answer: [
          'Kafede sipariş:',
          '- Jednu kafu, molim. → Bir kahve, lütfen.',
          '- Sa mlijekom. → Sütlü.',
          '- Bez šećera. → Şekersiz.',
          '- Račun, molim. → Hesap, lütfen.',
        ].join('\n'),
      },
      {
        keys: ['ekmek', 'hljeb', 'kruh', 'hleb'],
        answer: [
          'Varyant farkı:',
          '- Boşnakça: **hljeb**',
          '- Hırvatça: **kruh**',
          '- Sırpça: **hleb**',
          '',
          'Örnek (BS): Svježi hljeb, molim. → Taze ekmek, lütfen.',
        ].join('\n'),
      },
      {
        keys: ['telaffuz', 'nasıl söylenir', 'ć', 'č', 'š', 'ž', 'đ'],
        answer: [
          'Kısa telaffuz rehberi:',
          '- **č** ≈ “ç” (çek)',
          '- **ć** ≈ daha yumuşak “ç”',
          '- **š** ≈ “ş”',
          '- **ž** ≈ “j” (Jurnal’daki j)',
          '- **đ** ≈ “c” ile “j” arası (đevrek)',
          '',
          'Kelimeyi yazarsan hece hece okuyuşunu çıkarırım.',
        ].join('\n'),
      },
    ];

    for (const p of phrases) {
      if (p.keys.some((k) => q.includes(k))) {
        return `${p.answer}\n\n${footer}`;
      }
    }

    if (input.lessonContext) {
      const snippet = input.lessonContext.replace(/\s+/g, ' ').slice(0, 180);
      return [
        'Bu ders bağlamında sorunu şöyle ele alabilirsin:',
        '',
        `1) Hedef kelimeyi cümlede kullan: “…”`,
        `2) Türkçe karşılığını söyle, sonra hedef dilde tekrarla.`,
        `3) Mini alıştırma: ders özetindeki ifadelerden birini kendi hayatına uyarla.`,
        '',
        `Ders özeti (kısaltılmış): ${snippet}…`,
        '',
        footer,
      ].join('\n');
    }

    return [
      'Anladım. Kısa bir öğrenme planı:',
      '',
      '1) Kelimeyi / cümleyi yaz.',
      '2) Ben Türkçe açıklayayım + hedef dilde 2 örnek vereyim.',
      '3) Sen bir cümle kur, düzelteyim.',
      '',
      'Şimdi net sor: “şu kelime ne demek?”, “şu cümleyi çevir”, “telaffuz et”.',
      '',
      footer,
    ].join('\n');
  }
}
