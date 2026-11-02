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
  CheckCircle2
} from 'lucide-react';
import { ChatMessage, Conversation, UserRole, UserProfile } from '../types';
import {
  subscribeToMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleMessageSubAdminAccess,
  getSystemSettings,
  updateSystemSettings,
  addAuditLog
} from '../services/cargoService';

interface ChatComponentProps {
  conversation: Conversation;
  currentUserProfile: UserProfile;
  onClose?: () => void;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
  conversation,
  currentUserProfile,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [customerMessagesAutoOn, setCustomerMessagesAutoOn] = useState(true);
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

  useEffect(() => {
    // Check if auto-on is enabled in settings
    getSystemSettings().then(settings => {
      if (settings) {
        if (settings.customerMessagesToSubAdminAutoOn !== undefined) {
          setCustomerMessagesAutoOn(settings.customerMessagesToSubAdminAutoOn);
        } else {
          setCustomerMessagesAutoOn(!settings.messageModeration);
        }
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

    return () => unsubscribe();
  }, [conversation.id, currentUserProfile.role]);

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
    } catch (err) {
      console.error(err);
      alert('Failed to update moderation settings.');
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
    // If sender is customer and auto-on is false, message is held from sub admin
    const sharedWithSubAdmin = !isCustomer || customerMessagesAutoOn;
    const moderationStatus = sharedWithSubAdmin ? 'approved' : 'pending_moderation';

    try {
      const recipientId = isCustomer
        ? conversation.subAdminId || 'sub_admin_1'
        : conversation.customerId;

      const recipientRole = isCustomer ? 'sub_admin' : 'customer';

      const messagePayload: Parameters<typeof sendMessage>[0] = {
        conversationId: conversation.id,
        senderId: currentUserProfile.uid,
        senderName: currentUserProfile.fullName,
        senderEmail: currentUserProfile.email || '',
        senderRole: currentUserProfile.role,
        recipientId,
        recipientRole,
        text: inputText.trim(),
        sharedWithSubAdmin,
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
      alert('Failed to edit message.');
    }
  };

  const handleToggleSubAdminAccess = async (msg: ChatMessage, allow: boolean) => {
    try {
      await toggleMessageSubAdminAccess(msg.id, allow);
      await addAuditLog(
        allow ? 'message_released_to_subadmin' : 'message_held_from_subadmin',
        currentUserProfile.fullName,
        currentUserProfile.role,
        `Super Admin ${allow ? 'released' : 'held'} customer message ID ${msg.id} ${allow ? 'for' : 'from'} Sub-Admin visibility.`,
        msg.id
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update message visibility.');
    }
  };

  const handleDelete = async (msg: ChatMessage) => {
    if (!confirm('Are you sure you want to delete this message in accordance with platform retention policy?')) {
      return;
    }
    try {
      await deleteMessage(msg.id, currentUserProfile.fullName);
      await addAuditLog(
        'message_deleted',
        currentUserProfile.fullName,
        currentUserProfile.role,
        `Super Admin deleted message ID ${msg.id} sent by ${msg.senderName}.`,
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

  // Get displayed text depending on viewer role
  const getMessageDisplayText = (msg: ChatMessage): string => {
    if (isCustomer) {
      // Customer sees the edited message if Super Admin modified it
      return msg.customerDisplayText || msg.text;
    }
    if (isSubAdmin) {
      // Sub Admin continues to see his old/original message as requested!
      return msg.text;
    }
    // Super Admin sees customer-facing text (or original)
    return msg.customerDisplayText || msg.text;
  };

  return (
    <div className="flex flex-col h-[620px] sm:h-[calc(100vh-140px)] min-h-[560px] max-h-[88vh] bg-slate-50 border border-gray-200 rounded-2xl overflow-hidden shadow-lg w-full">
      {/* Chat Header - Compact Sleek Header */}
      <div className="bg-[#0b132b] text-white px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between border-b border-[#1c2541]">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xs sm:text-sm shadow-inner text-white shrink-0">
            {isCustomer ? <Shield className="w-4 h-4 text-white" /> : conversation.customerName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <h3 className="font-bold text-xs sm:text-sm tracking-wide">
                {isCustomer ? 'Company Support' : conversation.customerName}
              </h3>
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {isCustomer ? 'Official Support Desk' : 'Verified Consignee'}
              </span>
            </div>
            <p className="text-xs text-gray-400">
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

        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Super Admin Moderation Banner matching image_af72ee61.png */}
      {isSuperAdmin && (
        customerMessagesAutoOn ? (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 transition-colors">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-extrabold tracking-wide uppercase text-emerald-800">
                CUSTOMER MESSAGES TO SUB-ADMIN: AUTO ON —
              </span>
              <span className="text-emerald-700">
                Sub-partner admin will now see new messages sent by customer
              </span>
            </div>
            <button
              onClick={handleToggleAutoOn}
              className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-[11px] uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer transition-colors shadow-xs shrink-0 ml-2"
              title="Click to hold customer messages from Sub-Admin until you approve them"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>TURN OFF</span>
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 transition-colors">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-extrabold tracking-wide uppercase text-amber-800">
                CUSTOMER MESSAGES TO SUB-ADMIN: AUTO OFF —
              </span>
              <span className="text-amber-700">
                Customer messages & photos are held for Super Admin review before Sub-Admin sees them
              </span>
            </div>
            <button
              onClick={handleToggleAutoOn}
              className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer transition-colors shadow-xs shrink-0 ml-2"
              title="Click to allow Sub-Admin to see customer messages automatically"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>TURN ON</span>
            </button>
          </div>
        )
      )}

      {/* Notice Banner for Customer when moderation is active */}
      {isCustomer && !customerMessagesAutoOn && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center space-x-2 text-xs text-amber-800">
          <Info className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Security Verification Active: Dispatched messages undergo central route clearance before delivery to station officers.
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-xs">
            No previous messages in this corridor. Send a message to start direct communication.
          </div>
        ) : (
          messages.map((msg) => {
            const isCustomerMsg = msg.senderRole === 'customer';
            const isSubAdminMsg = msg.senderRole === 'sub_admin';
            const isSuperAdminMsg = msg.senderRole === 'super_admin';

            // User requested: "chatting my own message supposed stay at right hand why the person sending message stays at left side"
            // Ensure any message originating from the currently viewing user is always on the RIGHT (isMe = true)
            const isMe = Boolean(
              (msg.senderId && currentUserProfile.uid && msg.senderId === currentUserProfile.uid) ||
              (msg.senderEmail && currentUserProfile.email && msg.senderEmail.toLowerCase().trim() === currentUserProfile.email.toLowerCase().trim()) ||
              (isCustomer && isCustomerMsg) ||
              (isSubAdmin && (isSubAdminMsg || msg.senderId === currentUserProfile.uid)) ||
              (isSuperAdmin && (isSuperAdminMsg || msg.senderId === currentUserProfile.uid))
            );

            const displayText = getMessageDisplayText(msg);

            // When viewed by a customer, ALL messages from super_admin or sub_admin are presented as "Company Support"
            const displayedSenderName = isCustomer
              ? (isCustomerMsg ? (currentUserProfile.fullName || 'You') : 'Company Support')
              : (msg.senderRole === 'customer' ? msg.senderName : (isSuperAdmin ? `${msg.senderName} (${isSuperAdminMsg ? 'Super Admin' : 'Sub Admin'})` : (isMe ? 'You' : msg.senderName)));

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 w-full`}
              >
                {/* Sender Identity & Role Badge */}
                <div className={`flex items-center space-x-1.5 text-[11px] px-1 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <span className={`font-bold ${isMe ? 'text-blue-600' : 'text-gray-700'}`}>
                    {isMe ? 'You' : displayedSenderName}
                  </span>
                  {isCustomer ? (
                    !isCustomerMsg ? (
                      <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black uppercase border border-blue-200 flex items-center space-x-1">
                        <Shield className="w-2.5 h-2.5 text-blue-600" />
                        <span>Company Support</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase border border-emerald-200">
                        Consignee
                      </span>
                    )
                  ) : (
                    <>
                      {isSuperAdminMsg && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase border border-amber-300">
                          Super Admin
                        </span>
                      )}
                      {isSubAdminMsg && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black uppercase border border-blue-200">
                          Sub Admin
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
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-xs relative group ${
                    isMe
                      ? isSuperAdminMsg
                        ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-tr-none self-end'
                        : 'bg-blue-600 text-white rounded-tr-none self-end shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none self-start shadow-xs'
                  }`}
                >
                  {/* Super Admin Control Actions (Edit / Delete / Visibility) */}
                  {isSuperAdmin && !msg.isDeleted && (
                    <div className="absolute right-2 -top-3.5 hidden group-hover:flex items-center space-x-1 bg-slate-900 text-white px-2 py-1 rounded-lg shadow-md z-10 text-[10px]">
                      {/* Edit button: Super Admin can edit Sub-Admin messages so customer sees edited text while Sub-Admin continues to see original! */}
                      <button
                        onClick={() => {
                          setEditingMessage(msg);
                          setEditText(msg.customerDisplayText || msg.text);
                        }}
                        className="px-1.5 py-0.5 hover:text-amber-400 flex items-center space-x-1 transition-colors cursor-pointer"
                        title="Edit Customer-Facing Text (Sub-Admin will continue to see their original message)"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit for Customer</span>
                      </button>

                      <button
                        onClick={() => handleDelete(msg)}
                        className="px-1.5 py-0.5 hover:text-red-400 flex items-center space-x-1 transition-colors cursor-pointer border-l border-slate-700"
                        title="Delete Message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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

                  {/* Super Admin Transparency View: Shows what customer sees vs what Sub-Admin sees if edited */}
                  {isSuperAdmin && msg.customerDisplayText && msg.customerDisplayText !== msg.text && (
                    <div className="mt-2 pt-2 border-t border-amber-300/40 text-[10px] text-amber-200 space-y-0.5">
                      <div className="font-bold flex items-center space-x-1">
                        <Edit2 className="w-3 h-3" />
                        <span>Super Admin Modified for Customer View:</span>
                      </div>
                      <div className="opacity-90">
                        Customer sees: &ldquo;{msg.customerDisplayText}&rdquo;
                      </div>
                      <div className="opacity-75 italic">
                        Sub-Admin still sees original: &ldquo;{msg.text}&rdquo;
                      </div>
                    </div>
                  )}

                  {/* Super Admin Sub-Admin Access Control on Customer Messages & Images */}
                  {isSuperAdmin && isCustomerMsg && (
                    <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] gap-2">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Lock className="w-3 h-3 text-gray-400" />
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="font-semibold">
                          {msg.sharedWithSubAdmin
                            ? 'Shared with Sub-Admins'
                            : 'Held from Sub-Admin'}
                        </span>
                      </div>

                      {msg.sharedWithSubAdmin ? (
                        <button
                          onClick={() => handleToggleSubAdminAccess(msg, false)}
                          className="px-2 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Hold from Sub-Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleSubAdminAccess(msg, true)}
                          className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          Accept for Sub-Admin to see
                        </button>
                      )}
                    </div>
                  )}

                  {/* Status Footer */}
                  <div
                    className={`flex items-center justify-end space-x-1.5 mt-1 text-[10px] ${
                      isMe ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    {msg.isEdited && isCustomer && (
                      <span className="italic font-medium">
                        (Edited)
                      </span>
                    )}

                    {msg.moderationStatus === 'pending_moderation' && isCustomer && (
                      <span className="flex items-center space-x-1 font-bold text-amber-500">
                        <Clock className="w-3 h-3" />
                        <span>Awaiting Routing Clearance</span>
                      </span>
                    )}

                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>

                    {isMe && msg.moderationStatus === 'approved' && (
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

      {/* Input Area matching image_af72ee61.png */}
      <div className="p-3 bg-white border-t border-gray-200 space-y-2">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,video/*,application/pdf"
        />

        {/* Textarea Input matching image_af72ee61.png */}
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
          placeholder="Type reply to customer (Shift+Enter for newline & gaps, Enter to send)..."
          className="w-full bg-slate-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl p-3 text-xs text-gray-800 placeholder-gray-400 outline-none resize-none transition-all"
        />

        {/* Toolbar below textarea matching image_af72ee61.png */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* Mic button */}
            <button
              type="button"
              onClick={() => alert('Voice note recording ready: speak into your microphone.')}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
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
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
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
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
              title="Attach Freight Photo"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={sending || (!inputText.trim() && !attachmentPreview)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Super Admin Message Edit Modal */}
      {editingMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100">
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
