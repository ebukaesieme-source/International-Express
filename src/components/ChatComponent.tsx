import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Clock,
  Shield,
  User,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCheck,
  Eye,
  EyeOff,
  Info,
  X,
  Mic,
  Lock,
  Users,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { ChatMessage, Conversation, UserRole, UserProfile } from '../types';
import {
  subscribeToMessages,
  sendMessage,
  editMessage,
  toggleMessageOriginalForCustomer,
  deleteMessage,
  toggleMessageSubAdminAccess,
  subscribeToSystemSettings,
  updateSystemSettings,
  addAuditLog,
  subscribeToUserProfile,
  markConversationRead
} from '../services/cargoService';

interface ChatComponentProps {
  conversation: Conversation;
  currentUserProfile: UserProfile;
  onClose?: () => void;
  onReturn?: () => void;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
  conversation,
  currentUserProfile,
  onClose,
  onReturn
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [customerMessagesAutoOn, setCustomerMessagesAutoOn] = useState(true);
  const [customerPresenceProfile, setCustomerPresenceProfile] = useState<UserProfile | null>(null);
  const [superAdminDirectToCustomer, setSuperAdminDirectToCustomer] = useState(true);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    url: string;
    type: 'image' | 'video' | 'document';
    name: string;
  } | null>(null);

  // Editing state for Super Admin
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');

  // Lightbox for media viewing
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customerMessagesAutoOnRef = useRef<boolean>(true);

  useEffect(() => {
    // Subscribe in real-time to system settings so moderation changes sync instantly across phones, tablets, and PCs
    const unsubSettings = subscribeToSystemSettings((settings) => {
      if (settings) {
        const autoOn =
          settings.customerMessagesToSubAdminAutoOn !== undefined
            ? settings.customerMessagesToSubAdminAutoOn
            : !settings.messageModeration;
        customerMessagesAutoOnRef.current = autoOn;
        setCustomerMessagesAutoOn(autoOn);
      }
    });

    // Mark conversation read for this role
    markConversationRead(conversation.id, currentUserProfile.role).catch(() => {});

    // Subscribe to customer presence updates (with proper cleanup for fallback listener)
    const targetCustId = conversation.customerId || (conversation.id ? conversation.id.replace('conv_', '') : '');
    let unsubFallbackPresence: (() => void) | null = null;
    const unsubPresence = subscribeToUserProfile(targetCustId, (profile) => {
      if (profile) {
        setCustomerPresenceProfile(profile);
      } else if (conversation.customerName?.toLowerCase().includes('debbie') && !unsubFallbackPresence) {
        unsubFallbackPresence = subscribeToUserProfile('debbieyates', (debProfile) => {
          if (debProfile) setCustomerPresenceProfile(debProfile);
        });
      }
    });

    const unsubscribe = subscribeToMessages(
      conversation.id,
      currentUserProfile.role,
      (newMsgs) => {
        setMessages(newMsgs);
        scrollToBottom();
      }
    );

    return () => {
      unsubSettings();
      unsubscribe();
      unsubPresence();
      if (unsubFallbackPresence) {
        unsubFallbackPresence();
      }
    };
  }, [conversation.id, conversation.customerId, conversation.customerName, currentUserProfile.role]);


  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleToggleAutoOn = async () => {
    const nextVal = !customerMessagesAutoOn;
    try {
      await updateSystemSettings(
        {
          customerMessagesToSubAdminAutoOn: nextVal,
          messageModeration: !nextVal
        },
        currentUserProfile.fullName
      );
      await addAuditLog(
        'sub_admin_message_auto_toggle',
        currentUserProfile.fullName,
        currentUserProfile.role,
        `Super Admin turned Customer Messages to Sub-Admin: ${nextVal ? 'AUTO ON' : 'AUTO OFF'}`
      );
      setCustomerMessagesAutoOn(nextVal);
      customerMessagesAutoOnRef.current = nextVal;
    } catch (err) {
      console.error('Failed to update customer message auto-delivery setting:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, forcedType?: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: 'image' | 'video' | 'document' = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (forcedType) type = forcedType;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentPreview({
        url: reader.result as string,
        type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachmentPreview) return;

    setSending(true);

    const isCustomer = currentUserProfile.role === 'customer';
    const isSuperAdmin = currentUserProfile.role === 'super_admin';
    const hasMediaOrReceipt = Boolean(attachmentPreview?.url);

    // If Super Admin is sending: direct message to customer means Sub Admin will NOT see it
    // If Customer sends a photo, video, document, or receipt: ALWAYS hold for Super Admin access approval first!
    const isDirectToCustomer = isSuperAdmin && superAdminDirectToCustomer;
    const sharedWithSubAdmin = isCustomer
      ? (hasMediaOrReceipt ? false : customerMessagesAutoOnRef.current)
      : !isDirectToCustomer;
    const hiddenFromSubAdmin = isCustomer ? !sharedWithSubAdmin : isDirectToCustomer;
    const moderationStatus: 'approved' | 'pending_moderation' =
      isCustomer && !sharedWithSubAdmin ? 'pending_moderation' : 'approved';

    try {
      const recipientId = isCustomer
        ? conversation.subAdminId || 'sub_admin_1'
        : conversation.customerId;

      const recipientRole = isCustomer ? 'sub_admin' : 'customer';

      // User requirement 2: "any message sent by sub admin or super admin will be seen as company support"
      const messageSenderName = isCustomer ? (currentUserProfile.fullName || 'Customer') : 'Company Support';

      const messagePayload: Parameters<typeof sendMessage>[0] = {
        conversationId: conversation.id,
        senderId: currentUserProfile.uid,
        senderName: messageSenderName,
        senderEmail: currentUserProfile.email || '',
        senderRole: currentUserProfile.role,
        recipientId,
        recipientRole,
        text: inputText.trim(),
        sharedWithSubAdmin,
        hiddenFromSubAdmin,
        isDirectToCustomer,
        moderationStatus,
        isEdited: false,
        isDeleted: false
      };

      if (attachmentPreview?.url) {
        messagePayload.attachmentUrl = attachmentPreview.url;
        messagePayload.attachmentType = attachmentPreview.type;
        messagePayload.attachmentName = attachmentPreview.name;
      }

      await sendMessage(messagePayload);

      if (isDirectToCustomer) {
        await addAuditLog(
          'super_admin_direct_message',
          currentUserProfile.fullName,
          currentUserProfile.role,
          `Super Admin sent direct message to customer ${conversation.customerName} (Hidden from Sub-Admin): "${inputText.trim().substring(0, 50)}"`
        );
      }

      setInputText('');
      setAttachmentPreview(null);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Message could not be sent. Please check network connection.');
    } finally {
      setSending(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;
    try {
      await editMessage(editingMessage.id, editText.trim(), currentUserProfile.fullName);
      await addAuditLog(
        'message_edited_for_customer',
        currentUserProfile.fullName,
        currentUserProfile.role,
        `Super Admin edited message ID ${editingMessage.id}. Customer will see "${editText.trim()}"; Sub-Admin continues to see original text "${editingMessage.text}".`,
        editingMessage.id
      );
      setEditingMessage(null);
      setEditText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleOldMessageForCustomer = async (msg: ChatMessage, showOriginal: boolean) => {
    try {
      await toggleMessageOriginalForCustomer(msg.id, showOriginal);
      await addAuditLog(
        showOriginal ? 'old_message_for_customer_on' : 'old_message_for_customer_off',
        currentUserProfile.fullName,
        currentUserProfile.role,
        `Super Admin switched OLD MESSAGE FOR CUSTOMER ${showOriginal ? 'ON (Customer sees original message)' : 'OFF (Customer sees edited message)'} for message ID ${msg.id}.`,
        msg.id
      );
    } catch (err) {
      console.error('Failed to toggle old message for customer:', err);
    }
  };

  const handleToggleSubAdminAccess = async (msg: ChatMessage, allow: boolean) => {
    try {
      await toggleMessageSubAdminAccess(msg.id, allow);
      const msgOwner = msg.senderRole === 'super_admin' ? 'Super Admin direct' : 'customer';
      await addAuditLog(
        allow ? 'message_released_to_subadmin' : 'message_held_from_subadmin',
        currentUserProfile.fullName,
        currentUserProfile.role,
        `Super Admin turned Sub-Admin visibility ${allow ? 'ON' : 'OFF'} for ${msgOwner} message ID ${msg.id}.`,
        msg.id
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update message visibility.');
    }
  };

  const handleDelete = async (msg: ChatMessage) => {
    const isCustomerMsg = msg.senderRole === 'customer';
    const isSubAdminMsg = msg.senderRole === 'sub_admin';
    const roleLabel = isCustomerMsg ? 'Customer' : isSubAdminMsg ? 'Sub Admin' : 'Admin';
    if (!confirm(`Super Admin Action: Permanently delete this ${roleLabel} message? This will instantly remove it for both customer and sub admin.`)) {
      return;
    }
    try {
      await deleteMessage(msg.id, currentUserProfile.fullName);
      await addAuditLog(
        'message_deleted',
        currentUserProfile.fullName,
        currentUserProfile.role,
        `Super Admin deleted ${roleLabel} message ID ${msg.id} sent by ${msg.senderName}: "${(msg.text || '').substring(0, 40)}"`,
        msg.id
      );
    } catch (err) {
      console.error(err);
      alert('Failed to delete message.');
    }
  };

  const isSuperAdmin = currentUserProfile.role === 'super_admin';
  const isSubAdmin = currentUserProfile.role === 'sub_admin';
  const isCustomer = currentUserProfile.role === 'customer';

  // Customer presence helper (calculates Active Online or how many hours offline)
  const getCustomerPresenceInfo = () => {
    const isOnline = customerPresenceProfile?.isOnline;
    const lastSeen = customerPresenceProfile?.lastSeen;

    if (isOnline) {
      if (!lastSeen) return { isOnline: true, text: 'Active Online', subtext: 'Online now' };
      const diffMs = Date.now() - new Date(lastSeen).getTime();
      if (diffMs < 5 * 60 * 1000) {
        return { isOnline: true, text: 'Active Online', subtext: 'Online now' };
      }
    }

    if (!lastSeen) {
      return { isOnline: false, text: 'Offline for 3 hours', subtext: 'Last online: 3 hours ago' };
    }

    const diffMs = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diffMs / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 2) {
      return { isOnline: false, text: 'Offline just now', subtext: 'Last seen just now' };
    }
    if (minutes < 60) {
      return { isOnline: false, text: `Offline for ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`, subtext: `Last active ${minutes}m ago` };
    }
    if (hours < 24) {
      return { isOnline: false, text: `Offline for ${hours} ${hours === 1 ? 'hour' : 'hours'}`, subtext: `Last active ${hours}h ago` };
    }
    return { isOnline: false, text: `Offline for ${days} ${days === 1 ? 'day' : 'days'}`, subtext: `Last active ${days}d ago` };
  };

  // User requested: "super admin can edit sub admin message to customer, but sub admin will still see his old message, only the customer will see the new message"
  // AND: "after super admin have edited messages, there power to still choose the old message to appear for customer, WRITTEN OLD MESSAGER FOR CUSTOMER ON."
  const getMessageDisplayText = (msg: ChatMessage): string => {
    if (isSubAdmin) {
      // Sub Admin ALWAYS continues to see his old/original message as requested!
      return msg.originalText || msg.text;
    }
    if (msg.showOriginalToCustomer === true) {
      // Super Admin switched "OLD MESSAGE FOR CUSTOMER: ON" -> show the old/original message to customer!
      return msg.originalText || msg.text;
    }
    if (isCustomer) {
      // Customer sees the edited message when OLD MESSAGE FOR CUSTOMER is OFF
      return msg.customerDisplayText || msg.text;
    }
    // Super Admin sees what the customer currently sees
    return msg.customerDisplayText || msg.text;
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] sm:h-[calc(100dvh-88px)] min-h-[420px] max-h-[94dvh] bg-slate-50 border border-gray-200 rounded-2xl overflow-hidden shadow-lg w-full">
      {/* Chat Header - Compact Sleek Header */}
      <div className="bg-[#0b132b] text-white px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between border-b border-[#1c2541] gap-2 shrink-0">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xs sm:text-sm shadow-inner text-white shrink-0">
            {isCustomer ? <Shield className="w-4 h-4 text-white" /> : conversation.customerName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-1">
              <h3 className="font-bold text-xs sm:text-sm tracking-wide truncate">
                {isCustomer ? 'Company Support' : conversation.customerName}
              </h3>
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                {isCustomer ? 'Official Support Desk' : 'Verified Consignee'}
              </span>

              {/* Customer Online / Offline Status Badge matching image_23e32618.png */}
              {!isCustomer ? (() => {
                const presence = getCustomerPresenceInfo();
                return (
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 shrink-0 border transition-all ${
                      presence.isOnline
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                        : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        presence.isOnline
                          ? 'bg-emerald-400 animate-pulse ring-2 ring-emerald-400/40'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span>{presence.text}</span>
                  </span>
                );
              })() : (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0 border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Active Online • Support Desk</span>
                </span>
              )}

              {/* Signs of Number of Messages Badge */}
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center space-x-1 shrink-0">
                <span className="text-gray-300">Signs of Messages:</span>
                <strong className="text-white">
                  {messages.length > 0 ? `Sign #1 – #${messages.length}` : '0 msgs'}
                </strong>
                <span className="text-blue-200 text-[9px]">({messages.length})</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-400 truncate">
              {isCustomer ? (
                <span>24/7 Dedicated Logistics Support & Tracking Assistance</span>
              ) : (
                <span>
                  Channel: <span className="text-blue-400 font-mono">{conversation.id}</span>
                  {conversation.subAdminName && (
                    <span className="ml-2 text-gray-400">
                      • Assigned: <strong className="text-gray-200">{conversation.subAdminName}</strong>
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls: Super Admin Compact Auto Toggle, Return icon and X close button */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleToggleAutoOn}
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-colors shadow-xs border shrink-0 ${
                customerMessagesAutoOn
                  ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400/50'
                  : 'bg-amber-500/90 hover:bg-amber-500 text-slate-950 border-amber-300/60'
              }`}
              title={
                customerMessagesAutoOn
                  ? 'Customer text to Sub-Admin: AUTO ON (photos & receipts always wait for Super Admin). Click to turn OFF.'
                  : 'Customer messages, photos & receipts wait for Super Admin access. Click to turn AUTO ON.'
              }
            >
              {customerMessagesAutoOn ? (
                <Eye className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="hidden sm:inline">
                Sub-Admin Auto: {customerMessagesAutoOn ? 'ON' : 'OFF'}
              </span>
              <span className="sm:hidden">Auto: {customerMessagesAutoOn ? 'ON' : 'OFF'}</span>
            </button>
          )}
          {(onReturn || onClose) && (
            <button
              onClick={onReturn || onClose}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-white flex items-center space-x-1.5 cursor-pointer border border-blue-400/30 transition-all text-xs font-bold shadow-xs"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Return</span>
            </button>
          )}
          {(onClose || onReturn) && (
            <button
              onClick={onClose || onReturn}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white transition-colors cursor-pointer border border-slate-700 shadow-xs"
              title="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-xs">
            No previous messages in this corridor. Send a message to start direct communication.
          </div>
        ) : (
          messages.map((msg, msgIndex) => {
            const isCustomerMsg = msg.senderRole === 'customer';
            const isSubAdminMsg = msg.senderRole === 'sub_admin';
            const isSuperAdminMsg = msg.senderRole === 'super_admin';
            const isAdminSideMsg = isSubAdminMsg || isSuperAdminMsg;

            // Keep all Admin messages (Sub Admin & Super Admin) strictly on the Admin side,
            // and Customer messages strictly on the Customer side.
            const isMe = isCustomer ? isCustomerMsg : isAdminSideMsg;

            const isOwnDirectMessage =
              (isCustomer && isCustomerMsg) ||
              (isSubAdmin && isSubAdminMsg) ||
              (isSuperAdmin && isSuperAdminMsg);

            const displayText = getMessageDisplayText(msg);

            // User requirement: "any message sent by sub admin or super admin will be seen as company support"
            const displayedSenderName = isCustomer
              ? (isCustomerMsg ? (currentUserProfile.fullName || 'You') : 'Company Support')
              : isSubAdmin
              ? (isSubAdminMsg ? 'Company Support (You)' : isSuperAdminMsg ? 'Company Support' : msg.senderName)
              : (msg.senderRole === 'customer'
                  ? msg.senderName
                  : isSuperAdminMsg
                  ? 'Company Support (Super Admin)'
                  : `Company Support (Sub Admin: ${msg.senderName})`);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 w-full`}
              >
                {/* Sender Identity & Role Badge + Message Number Sign (1 to 10 etc.) */}
                <div className={`flex items-center space-x-1.5 text-[11px] px-1 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Sequential Message Number Sign (1 to 10 etc.) */}
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono font-black text-[9px] border shadow-2xs flex items-center space-x-0.5 ${
                      isMe
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                    title={`Message Sign #${msgIndex + 1}`}
                  >
                    <span>Sign #{msgIndex + 1}</span>
                  </span>

                  <span className={`font-bold ${isMe ? 'text-blue-600' : 'text-gray-700'}`}>
                    {isOwnDirectMessage ? 'You' : displayedSenderName}
                  </span>
                  {isCustomer ? (
                    !isCustomerMsg ? (
                      /* Any message sent by sub admin or super admin is seen as Company Support by customer */
                      <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black uppercase border border-blue-200 flex items-center space-x-1">
                        <Shield className="w-2.5 h-2.5 text-blue-600" />
                        <span>Company Support</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase border border-emerald-200">
                        Consignee
                      </span>
                    )
                  ) : isSubAdmin ? (
                    isSubAdminMsg || isSuperAdminMsg ? (
                      <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black uppercase border border-blue-200 flex items-center space-x-1">
                        <Shield className="w-2.5 h-2.5 text-blue-600" />
                        <span>Company Support</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase border border-emerald-200">
                        Customer
                      </span>
                    )
                  ) : (
                    <>
                      {isSuperAdminMsg && (
                        <div className="flex items-center space-x-1">
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase border border-amber-300">
                            Super Admin
                          </span>
                          {msg.sharedWithSubAdmin === true && !msg.hiddenFromSubAdmin ? (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-200 flex items-center space-x-1">
                              <Eye className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Sub Admin: ON</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9px] font-bold border border-purple-200 flex items-center space-x-1">
                              <Lock className="w-2.5 h-2.5 text-purple-600" />
                              <span>Direct Private</span>
                            </span>
                          )}
                        </div>
                      )}
                      {isSubAdminMsg && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black uppercase border border-blue-200 flex items-center space-x-1">
                          <Shield className="w-2.5 h-2.5 text-blue-600" />
                          <span>Company Support (Sub Admin)</span>
                        </span>
                      )}
                      {isCustomerMsg && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase border border-emerald-200">
                          Customer
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Bubble Container */}
                <div
                  className={`max-w-[92%] sm:max-w-[78%] rounded-2xl px-3.5 sm:px-4 py-2.5 shadow-xs relative group break-words ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-none self-end shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none self-start shadow-xs'
                  }`}
                >
                  {/* Super Admin Control Actions: Edit for Customer & Delete Both Customer and Sub Admin Messages */}
                  {isSuperAdmin && (
                    <div className={`flex items-center space-x-1.5 mt-1 mb-2 pt-1 pb-1 border-b ${isMe ? 'border-white/20' : 'border-black/10'} text-[10px] flex-wrap gap-y-1`}>
                      {/* Edit button: Super Admin can edit Sub-Admin messages */}
                      <button
                        onClick={() => {
                          setEditingMessage(msg);
                          setEditText(msg.customerDisplayText || msg.text);
                        }}
                        className={`px-2 py-0.5 rounded font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs ${
                          isMe
                            ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 border border-amber-500/30'
                        }`}
                        title="Edit Message"
                      >
                        <Edit2 className={`w-3 h-3 ${isMe ? 'text-white' : 'text-amber-600'}`} />
                        <span>Edit for Customer</span>
                      </button>

                      {/* Super Admin power to delete both Customer and Sub Admin messages */}
                      {isCustomerMsg && (
                        <button
                          onClick={() => handleDelete(msg)}
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-extrabold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Super Admin Power: Permanently delete message sent by customer to Sub-Admin"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                          <span>Delete Customer Message</span>
                        </button>
                      )}

                      {isSubAdminMsg && (
                        <button
                          onClick={() => handleDelete(msg)}
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-extrabold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Super Admin Power: Permanently delete message sent by Sub-Admin to customer"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                          <span>Delete Sub Admin Message</span>
                        </button>
                      )}

                      {isSuperAdminMsg && (
                        <button
                          onClick={() => handleDelete(msg)}
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-extrabold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Super Admin: Permanently delete this admin message"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                          <span>Delete Admin Message</span>
                        </button>
                      )}
                    </div>
                  )}


                  {/* Attachment Previews */}
                  {msg.attachmentUrl && (
                    <div className="mb-2.5 rounded-xl overflow-hidden border border-black/10">
                      {msg.attachmentType === 'image' && (
                        <img
                          src={msg.attachmentUrl}
                          alt={msg.attachmentName || 'Attached freight photo'}
                          className="max-h-60 rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setLightboxUrl(msg.attachmentUrl!)}
                        />
                      )}

                      {msg.attachmentType === 'video' && (
                        <video
                          src={msg.attachmentUrl}
                          controls
                          className="max-h-60 rounded-xl w-full bg-black"
                        />
                      )}

                      {msg.attachmentType === 'document' && (
                        <a
                          href={msg.attachmentUrl}
                          download={msg.attachmentName || 'waybill_doc.pdf'}
                          className={`flex items-center space-x-2 p-2.5 rounded-xl text-xs font-semibold ${
                            isMe ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate">{msg.attachmentName || 'Consignment Waybill Document'}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Message Text */}
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.isDeleted ? 'italic opacity-70' : ''}`}>
                    {displayText}
                  </div>

                  {/* Super Admin Transparency View & Power to Switch Back to Old Message for Customer */}
                  {isSuperAdmin && (msg.isEdited || (msg.customerDisplayText && msg.customerDisplayText !== (msg.originalText || msg.text))) && (() => {
                    const oldMessageOn = msg.showOriginalToCustomer === true;
                    const originalMsgText = msg.originalText || msg.text;
                    const editedMsgText = msg.customerDisplayText || msg.text;
                    return (
                      <div className={`mt-2 pt-2 border-t text-[10px] space-y-1.5 ${isMe ? 'border-white/25 text-blue-100' : 'border-amber-300/60 text-amber-900'}`}>
                        <div className="flex items-center justify-between flex-wrap gap-1.5">
                          <div className="font-bold flex items-center space-x-1">
                            <Edit2 className="w-3 h-3" />
                            <span>
                              {oldMessageOn ? 'Customer Currently Sees: OLD MESSAGE' : 'Customer Currently Sees: EDITED MESSAGE'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleOldMessageForCustomer(msg, !oldMessageOn)}
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer shadow-xs border ${
                              oldMessageOn
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-200'
                                : isMe
                                ? 'bg-white/20 hover:bg-white/30 text-white border-white/35'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                            }`}
                            title={
                              oldMessageOn
                                ? 'OLD MESSAGE FOR CUSTOMER is ON — customer sees the original old message. Click to switch back to the edited message.'
                                : 'Click to turn OLD MESSAGE FOR CUSTOMER ON so the old original message appears for the customer.'
                            }
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                oldMessageOn ? 'bg-emerald-600' : isMe ? 'bg-blue-200/80' : 'bg-amber-500/70'
                              }`}
                            />
                            <span>OLD MESSAGE FOR CUSTOMER: {oldMessageOn ? 'ON' : 'OFF'}</span>
                          </button>
                        </div>
                        <div className={oldMessageOn ? 'opacity-75' : 'font-semibold opacity-100'}>
                          Edited: &ldquo;{editedMsgText}&rdquo;
                        </div>
                        <div className={oldMessageOn ? 'font-semibold opacity-100' : 'opacity-80 italic'}>
                          Old / Original: &ldquo;{originalMsgText}&rdquo;
                        </div>
                      </div>
                    );
                  })()}

                  {/* Super Admin Sub-Admin Visibility Toggle on Direct Messages written by Super Admin */}
                  {isSuperAdmin && isSuperAdminMsg && (() => {
                    const canSubAdminSee = msg.sharedWithSubAdmin === true && !msg.hiddenFromSubAdmin;
                    return (
                      <div className="mt-2 pt-2 border-t border-white/25 flex flex-wrap items-center justify-between text-[11px] gap-2">
                        <div className="flex items-center space-x-1.5 text-blue-50">
                          {canSubAdminSee ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                          )}
                          <span className="font-bold text-[10px]">
                            Sub Admin View: {canSubAdminSee ? 'ON' : 'OFF'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleSubAdminAccess(msg, !canSubAdminSee)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shadow-xs ${
                            canSubAdminSee
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              canSubAdminSee ? 'bg-white' : 'bg-blue-200/80'
                            }`}
                          />
                          <span>{canSubAdminSee ? 'ON — Turn OFF' : 'OFF — Turn ON'}</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Super Admin Sub-Admin Access Control on Customer Messages, Photos & Receipts */}
                  {isSuperAdmin && isCustomerMsg && (() => {
                    const isMediaOrReceipt = Boolean(msg.attachmentUrl || msg.attachmentType);
                    const hasSubAdminAccess =
                      msg.sharedWithSubAdmin === true &&
                      msg.hiddenFromSubAdmin !== true &&
                      msg.moderationStatus !== 'pending_moderation' &&
                      msg.moderationStatus !== 'rejected';
                    return (
                      <div className={`mt-2 pt-2 border-t flex flex-wrap items-center justify-between text-[11px] gap-2 ${
                        !hasSubAdminAccess && isMediaOrReceipt
                          ? 'border-amber-300 bg-amber-50/80 -mx-2 px-2 py-1.5 rounded-xl'
                          : 'border-gray-200/60'
                      }`}>
                        <div className={`flex items-center space-x-1 ${
                          !hasSubAdminAccess && isMediaOrReceipt ? 'text-amber-900' : 'text-gray-600'
                        }`}>
                          {hasSubAdminAccess ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span className="font-bold text-[10px]">
                            {isMediaOrReceipt
                              ? hasSubAdminAccess
                                ? 'Photo / Receipt: Delivered to Sub-Admin'
                                : 'Photo / Receipt Held — Needs Super Admin Access'
                              : hasSubAdminAccess
                              ? 'Shared with Sub-Admins'
                              : 'Held from Sub-Admin'}
                          </span>
                        </div>

                        {hasSubAdminAccess ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSubAdminAccess(msg, false)}
                            className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Hold from Sub-Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleSubAdminAccess(msg, true)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold cursor-pointer transition-colors shadow-xs"
                          >
                            Give Access to Sub-Admin
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Status Footer */}
                  <div
                    className={`flex items-center justify-end space-x-1.5 mt-1 text-[10px] ${
                      isMe ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>

                    {isMe && msg.moderationStatus !== 'rejected' && (
                      <CheckCheck className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Box */}
      {attachmentPreview && (
        <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {attachmentPreview.type === 'image' && (
              <img
                src={attachmentPreview.url}
                alt="Preview"
                className="w-12 h-12 rounded-xl object-cover border border-gray-200"
              />
            )}
            {attachmentPreview.type === 'video' && (
              <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-white">
                <VideoIcon className="w-6 h-6" />
              </div>
            )}
            {attachmentPreview.type === 'document' && (
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-800 truncate max-w-[200px]">
                {attachmentPreview.name}
              </p>
              <span className="text-[10px] uppercase font-bold text-blue-600">
                Ready to send {attachmentPreview.type}
              </span>
            </div>
          </div>

          <button
            onClick={() => setAttachmentPreview(null)}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-2.5 sm:p-3 bg-white border-t border-gray-200 space-y-1.5 shrink-0">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,video/*,application/pdf"
        />

        {/* Textarea Input */}
        <textarea
          rows={2}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={
            isCustomer
              ? "Type message to Company Support..."
              : "Type reply to customer (Shift+Enter for newline, Enter to send)..."
          }
          className="w-full bg-slate-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl p-2.5 text-xs text-gray-800 placeholder-gray-400 outline-none resize-none transition-all"
        />

        {/* Toolbar below textarea */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center space-x-1">
            {/* Mic button */}
            <button
              type="button"
              onClick={() => alert('Voice note recording ready: speak into your microphone.')}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
              title="Record Voice Dispatch Note"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Document / Paperclip */}
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'application/pdf,.doc,.docx,.txt';
                  fileInputRef.current.click();
                }
              }}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
              title="Attach Document / Waybill"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Gallery / Image button */}
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*';
                  fileInputRef.current.click();
                }
              }}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
              title="Attach Freight Photo"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Compact Super Admin Direct Message Sub Admin View Switch */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setSuperAdminDirectToCustomer(!superAdminDirectToCustomer)}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer border ${
                  !superAdminDirectToCustomer
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
                }`}
                title="Toggle whether Sub Admin can see the message you are about to send"
              >
                {superAdminDirectToCustomer ? (
                  <Lock className="w-3 h-3 text-purple-700 shrink-0" />
                ) : (
                  <Eye className="w-3 h-3 text-white shrink-0" />
                )}
                <span>Sub Admin View: {!superAdminDirectToCustomer ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={sending || (!inputText.trim() && !attachmentPreview)}
              className="flex items-center space-x-1.5 px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Super Admin Message Edit Modal */}
      {editingMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-500" />
                <span>Super Admin Message Correction</span>
              </h3>
              <button
                onClick={() => setEditingMessage(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Important Transparency Rule:</p>
              <p>
                The <strong>customer will see this edited text</strong>. The Sub-Admin <strong>continues to see their original text</strong> (&ldquo;{editingMessage.text}&rdquo;).
              </p>
              <p className="text-[10px] text-amber-700 mt-1">
                An audit log will be created recording both versions.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Customer-Facing Display Text:</label>
              <textarea
                rows={5}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Enter corrected message for the customer..."
                className="w-full p-3.5 border border-gray-300 rounded-2xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setEditingMessage(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Save & Update for Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for full size photo */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-zoom-out"
        >
          <img
            src={lightboxUrl}
            alt="Expanded Attachment"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
