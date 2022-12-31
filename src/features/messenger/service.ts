import {
  GroupChatDuplicateUsers,
  GroupChatUsersCountError,
} from "features/messenger/errors";
import type {
  GroupChatParticipant,
  PrivateChat,
  UserId,
} from "features/messenger/types";
import { ForbiddenError } from "types/error";

export function validatePrivateChatOwner(userId: UserId, chat: PrivateChat) {
  const valid = chat.user1Id === userId || chat.user2Id === userId;
  if (!valid) {
    throw new ForbiddenError({
      userId,
      entity: "PrivateChat",
      entityId: chat.id,
    });
  }
}

export function validateGroupChatOwner(
  groupChatId: string,
  userId: UserId,
  participants: GroupChatParticipant[]
) {
  const valid = participants.some(
    (participant: GroupChatParticipant) => participant.userId === userId
  );
  if (!valid) {
    throw new ForbiddenError({
      userId,
      entity: "GroupChat",
      entityId: groupChatId,
    });
  }
}

export function validateUserInGroupParticipant(
  userId: UserId,
  userIds: UserId[]
) {
  const set = new Set();
  const duplicateIds = new Set();
  for (const id of userIds) {
    if (set.has(id)) {
      duplicateIds.add(id);
      continue;
    }
    set.add(id);
  }

  if (duplicateIds.size) {
    throw new GroupChatDuplicateUsers([...duplicateIds] as string[]);
  }

  if (!set.has(userId)) {
    throw new Error(
      "userId is missing from the group chat userIds. Hint: add the userId to the userIds"
    );
  }
}

export function validateGroupChatUsersCount(userIds: string[]) {
  const n = userIds.length;
  if (n < GroupChatUsersCountError.min || n > GroupChatUsersCountError.max) {
    throw new GroupChatUsersCountError(n);
  }
}
