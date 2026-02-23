import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Lang } from '../i18n';

@Injectable()
export class DeepseekService {
  private readonly logger = new Logger(DeepseekService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.deepseek.com';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
  }

  /**
   * Generate a travel itinerary using DeepSeek AI
   */
  async generateItinerary(params: {
    destination: string;
    duration: number;
    budget: string;
    vibe: string;
    lang?: Lang;
  }): Promise<any> {
    const { destination, duration, budget, vibe, lang = 'en' } = params;

    const langInstruction = lang === 'zh'
      ? '请用中文回复。所有文本内容必须是中文。'
      : 'Respond in English. All text content must be in English.';

    const systemPrompt = `You are a professional travel planner AI. Generate detailed travel itineraries in JSON format.
${langInstruction}
Your response MUST be valid JSON only, with no markdown, no code blocks, no explanation text.
The JSON must follow this exact structure:
{
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "time_range": "09:00 AM - 08:00 PM",
      "activities": [
        {
          "name": "Activity name",
          "description": "2-3 sentence description of the activity",
          "time": "09:00 AM - 11:00 AM",
          "tips": "Practical tips for this activity",
          "category": "sightseeing|food|culture|nature|shopping|entertainment",
          "estimated_cost": "$XX"
        }
      ]
    }
  ],
  "summary": "A brief 2-3 sentence summary of the entire trip",
  "best_time_to_visit": "Best months to visit",
  "local_tips": ["tip1", "tip2", "tip3"]
}
Each day should have 3-5 activities. Make activities specific to the destination with real place names.`;

    const userPrompt = lang === 'zh'
      ? `为 ${destination} 创建一个 ${duration} 天的旅行行程。\n预算水平：${budget}\n旅行风格：${vibe}\n请包含真实具体的景点、餐厅和活动，让行程实用可执行。`
      : `Create a ${duration}-day travel itinerary for ${destination}.\nBudget level: ${budget}\nTravel style/vibe: ${vibe}\nInclude real, specific places, restaurants, and attractions. Make it practical and actionable.`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 60000,
        },
      );

      const content = response.data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from DeepSeek API');
      }

      const parsed = JSON.parse(content);
      this.logger.log(`Generated itinerary for ${destination} (${duration} days, lang=${lang})`);
      return parsed;
    } catch (error) {
      this.logger.error(`DeepSeek API error: ${error.message}`);
      return this.generateFallbackItinerary(params);
    }
  }

  /**
   * Fallback itinerary when API is unavailable
   */
  private generateFallbackItinerary(params: {
    destination: string;
    duration: number;
    budget: string;
    vibe: string;
    lang?: Lang;
  }) {
    const isZh = params.lang === 'zh';
    const days = [];

    for (let i = 1; i <= params.duration; i++) {
      days.push({
        day: i,
        title: isZh
          ? `第${i}天：${params.destination}之旅`
          : `Day ${i} in ${params.destination}`,
        time_range: '09:00 AM - 08:00 PM',
        activities: [
          {
            name: isZh ? `探索${params.destination} - 上午` : `Explore ${params.destination} - Morning`,
            description: isZh
              ? `开始探索${params.destination}的精华景点。这段${params.vibe}体验非常适合${params.budget}预算的旅行。`
              : `Start your day exploring the highlights of ${params.destination}. This ${params.vibe.toLowerCase()} experience is perfect for a ${params.budget.toLowerCase()} budget trip.`,
            time: '09:00 AM - 12:00 PM',
            tips: isZh ? '建议早起避开人群' : 'Start early to avoid crowds',
            category: 'sightseeing',
            estimated_cost: isZh ? '价格不等' : 'Varies',
          },
          {
            name: isZh ? '品尝当地美食' : 'Local Cuisine Experience',
            description: isZh
              ? `在${params.destination}的人气餐厅品尝正宗当地美食。`
              : `Enjoy authentic local food at popular restaurants in ${params.destination}.`,
            time: '12:00 PM - 02:00 PM',
            tips: isZh ? '一定要尝试当地特色菜' : 'Try the local specialties',
            category: 'food',
            estimated_cost: isZh ? '价格不等' : 'Varies',
          },
          {
            name: isZh ? `下午${params.vibe}活动` : `Afternoon ${params.vibe} Activity`,
            description: isZh
              ? `下午继续在${params.destination}的${params.vibe}之旅。`
              : `Continue your ${params.vibe.toLowerCase()} journey through ${params.destination} in the afternoon.`,
            time: '02:00 PM - 06:00 PM',
            tips: isZh ? '提前查看营业时间' : 'Check opening hours in advance',
            category: params.vibe.toLowerCase() === 'culture' ? 'culture' : 'sightseeing',
            estimated_cost: isZh ? '价格不等' : 'Varies',
          },
        ],
      });
    }

    return {
      days,
      summary: isZh
        ? `${params.destination} ${params.duration}天${params.vibe}之旅，${params.budget}预算。（AI 生成内容暂时不可用，显示默认行程）`
        : `A ${params.duration}-day ${params.vibe.toLowerCase()} trip to ${params.destination} on a ${params.budget.toLowerCase()} budget. (AI-generated content temporarily unavailable, showing fallback itinerary)`,
      best_time_to_visit: isZh ? '请查看当地天气选择最佳出行时间' : 'Check local weather for best times',
      local_tips: isZh
        ? ['出发前了解当地风俗', '重要证件随身携带', '学几句当地常用语']
        : ['Research local customs before your trip', 'Keep important documents in a safe place', 'Try to learn a few basic phrases in the local language'],
    };
  }
}
