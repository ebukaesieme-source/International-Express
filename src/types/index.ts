export type UserRole = 'super_admin' | 'sub_admin' | 'customer';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  photoUrl?: string;
  avatarUrl?: string;
  companyName?: string;
  phoneNumber?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  passportId?: string;
  assignedSubAdminId?: string;
  assignedSubAdminName?: string;
  isSuspended?: boolean;
  notes?: string;
  customPassword?: string;
  createdAt: string;
  updatedAt: string;
}

export type ShipmentStatus =
  | 'registered'
  | 'package_received'
  | 'picked_up'
  | 'processing'
  | 'sorting_facility'
  | 'departure'
  | 'in_transit'
  | 'arrival_destination'
  | 'customs_processing'
  | 'out_for_delivery'
  | 'delivered'
  | 'delayed'
  | 'failed'
  | 'cancelled';

export type CustomsPaymentStatus = 'pending' | 'partially_paid' | 'paid' | 'waived';

export interface ShipmentDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface ShipmentPhoto {
  id: string;
  name: string;
  url: string;
  caption?: string;
  uploadedAt: string;
}

export interface ItemizedFee {
  id: string;
  title: string; // e.g. "Shipment Cost Fee", "Customs Duty Fee", "EXTRA GOLD FOUND AT THE SUV ,WORTH HUGE SUM OF DOLLARS"
  purpose: string; // Reason / Purpose of payment (e.g. "CAR", "Standard border clearance inspection...")
  amount: number;
  currency: string; // e.g. "USD", "$"
  status: 'paid' | 'pending';
  paidAt?: string;
  paymentReference?: string;
  receiptUrl?: string;
  addedBy?: string;
  addedAt?: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  subAdminId: string;
  subAdminName: string;
  description: string;
  packageType: string;
  weightKg: number;
  pieces?: number;
  dimensions?: string;
  senderName: string;
  senderPhone?: string;
  senderAddress: string;
  senderCountry: string;
  recipientName: string;
  recipientPhone?: string;
  recipientAddress: string;
  recipientCountry: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  departureLocation: string;
  destinationLocation: string;
  currentLocation?: string;
  coordinates?: { latitude: number; longitude: number };
  carrier: string;
  status: ShipmentStatus;
  statusNotes?: string;
  delayExplanation?: string;
  deliveryProgressPercentage?: number;
  estimatedDeliveryDate: string;
  actualDeliveryDate?: string;
  customsDutyAmount: number;
  customsDutyCurrency: string;
  customsPaymentStatus: CustomsPaymentStatus;
  feePurpose?: string;
  customsReference?: string;
  customsNotes?: string;
  itemizedFees?: ItemizedFee[];
  packageImages?: string[];
  documents?: ShipmentDocument[];
  photos?: ShipmentPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface TrackingEvent {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  status: ShipmentStatus;
  title: string;
  description: string;
  location: string;
  facility?: string;
  coordinates?: { latitude: number; longitude: number };
  delayExplanation?: string;
  estimatedArrival?: string;
  deliveryProgressPercentage?: number;
  timestamp: string;
  recordedBy: string;
  recordedByRole: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  recipientRole?: UserRole | 'all';
  type: 'message' | 'delivery_update' | 'tracking_event' | 'assignment' | 'alert';
  title: string;
  message: string;
  linkId?: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  subAdminId: string;
  subAdminName: string;
  lastMessage: string;
  subAdminLastMessage?: string;
  lastMessageTime: string;
  unreadCustomerCount: number;
  unreadAdminCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderRole: UserRole;
  recipientId: string;
  recipientRole: string;
  text: string;
  customerDisplayText?: string;
  sharedWithSubAdmin?: boolean;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video' | 'document';
  attachmentName?: string;
  moderationStatus: 'approved' | 'pending_moderation' | 'rejected';
  rejectionReason?: string;
  isEdited?: boolean;
  editedAt?: string;
  editedBy?: string;
  originalText?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'confirmed' | 'pending' | 'failed';
  reference: string;
  receiptUrl?: string;
  notes?: string;
  confirmedBy?: string;
  createdAt: string;
}

export interface SystemSettings {
  id: string;
  messageModeration: boolean;
  customerMessagesToSubAdminAutoOn?: boolean;
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  announcement?: string;
  maintenanceMode?: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByRole: string;
  targetId?: string;
  targetType?: string;
  details: string;
  timestamp: string;
}
