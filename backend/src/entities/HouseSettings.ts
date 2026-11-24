import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class HouseSettings {
  @PrimaryKey()
  id: number = 1;

  // Ubicación del hogar para Open-Meteo
  @Property({ nullable: true })
  locationName?: string;

  @Property({ type: 'double', nullable: true })
  latitude?: number;

  @Property({ type: 'double', nullable: true })
  longitude?: number;

  @Property({ nullable: true })
  timezone?: string;

  // Notificaciones externas: ntfy
  @Property({ default: false })
  ntfyEnabled: boolean = false;

  @Property({ default: 'https://ntfy.sh' })
  ntfyServerUrl: string = 'https://ntfy.sh';

  @Property({ nullable: true })
  ntfyTopic?: string;

  // Notificaciones externas: Telegram
  @Property({ default: false })
  telegramEnabled: boolean = false;

  @Property({ nullable: true })
  telegramBotToken?: string;

  @Property({ nullable: true })
  telegramChatId?: string;

  // Notificaciones externas: Webhook genérico
  @Property({ default: false })
  webhookEnabled: boolean = false;

  @Property({ nullable: true })
  webhookUrl?: string;

  @Property()
  updatedAt: Date = new Date();
}
