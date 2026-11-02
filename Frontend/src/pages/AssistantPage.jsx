import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAssistant } from "../context/AssistantContext";
import AssistantChat from "../components/AssistantChat";
import {
  Button,
  ConfirmModal,
  Field,
  FormModal,
  IconButton,
  Input,
  useToast,
} from "../components/ui";

const RenameModal = ({ conversation, onClose }) => {
  const { renameConversation } = useAssistant();
  const [title, setTitle] = useState(conversation.title);

  return (
    <FormModal
      title="Rename conversation"
      submitLabel="Save name"
      onClose={onClose}
      onSubmit={() => renameConversation(conversation._id, title)}
    >
      <Field label="Name">
        <Input required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} />
      </Field>
    </FormModal>
  );
};

export default function AssistantPage() {
  const {
    conversations,
    conversationId,
    startNew,
    openConversation,
    deleteConversation,
  } = useAssistant();
  const toast = useToast();
  const [renaming, setRenaming] = useState(null);
  const [removing, setRemoving] = useState(null);

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6 h-[calc(100dvh-11rem)] lg:h-[calc(100dvh-10rem)]">
      <div className="hidden lg:flex flex-col min-h-0">
        <Button variant="secondary" onClick={startNew} className="w-full mb-3">
          <Plus size={16} /> New conversation
        </Button>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted px-1">Your conversations are saved here.</p>
        ) : (
          <ul className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
            {conversations.map((conversation) => (
              <li
                key={conversation._id}
                className={`group flex items-center rounded-lg ${
                  conversation._id === conversationId ? "bg-accent-soft" : "hover:bg-wash"
                }`}
              >
                <button
                  onClick={() => openConversation(conversation._id)}
                  className="flex-1 min-w-0 text-left px-3 py-2 truncate"
                >
                  {conversation.title}
                </button>
                <div className="hidden group-hover:flex group-focus-within:flex shrink-0 pr-1">
                  <IconButton label={`Rename ${conversation.title}`} onClick={() => setRenaming(conversation)}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton label={`Delete ${conversation.title}`} onClick={() => setRemoving(conversation)}>
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col min-h-0 border border-line rounded-xl bg-surface">
        {conversations.length > 0 && (
          <div className="lg:hidden flex gap-2 p-3 border-b border-line">
            <select
              aria-label="Conversation"
              value={conversationId || ""}
              onChange={(event) =>
                event.target.value ? openConversation(event.target.value) : startNew()
              }
              className="flex-1 min-w-0 h-9 px-2 border border-line-strong rounded-lg bg-surface"
            >
              <option value="">New conversation</option>
              {conversations.map((conversation) => (
                <option key={conversation._id} value={conversation._id}>
                  {conversation.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <AssistantChat />
      </div>

      {renaming && (
        <RenameModal conversation={renaming} onClose={() => setRenaming(null)} />
      )}
      {removing && (
        <ConfirmModal
          title="Delete this conversation?"
          description={removing.title}
          action="Delete conversation"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await deleteConversation(removing._id);
            toast.success("Conversation deleted");
          }}
        />
      )}
    </div>
  );
}
