export enum UserRole {
  GRAHOK = 'GRAHOK',
  DOKANDAR = 'DOKANDAR',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum EventType {
  SAMPLE_SALE = 'SAMPLE_SALE',
  WORKSHOP = 'WORKSHOP',
  IFTAR_NIGHT = 'IFTAR_NIGHT',
  PRODUCT_LAUNCH = 'PRODUCT_LAUNCH',
  EXHIBITION = 'EXHIBITION',
  LOYALTY_MEET = 'LOYALTY_MEET',
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  LOYALTY = 'LOYALTY',
}

export enum LoyaltyTier {
  NEW = 'NEW',
  REGULAR = 'REGULAR',
  VIP = 'VIP',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  BANNED = 'BANNED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
}

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}
