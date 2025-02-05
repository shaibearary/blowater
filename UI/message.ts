import { PublicKey } from "../lib/nostr-ts/key.ts";
import { MessageThread } from "./dm.tsx";
import { PlainText_Nostr_Event } from "../nostr.ts";
import { NoteID } from "../lib/nostr-ts/nip19.ts";

export function* parseContent(content: string) {
    // URLs
    yield* match(/https?:\/\/[^\s]+/g, content, "url");

    // npubs
    yield* match(/npub[0-9a-z]{59}/g, content, "npub");

    // notes
    yield* match(/note[0-9a-z]{59}/g, content, "note");

    // tags
    yield* match(/#\[[0-9]+\]/g, content, "tag");
}

function* match(regex: RegExp, content: string, type: ItemType): Generator<ContentItem, void, unknown> {
    let match;
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#return_value
    // If the match succeeds, the exec() method returns an array and
    // updates the lastIndex property of the regular expression object.
    while ((match = regex.exec(content)) !== null) {
        const urlStartPosition = match.index;
        if (urlStartPosition == undefined) {
            return;
        }
        const urlEndPosition = urlStartPosition + match[0].length - 1;
        if (type == "note") {
            const noteID = NoteID.FromBech32(content.slice(urlStartPosition, urlEndPosition + 1));
            if (noteID instanceof Error) {
                // ignore
            } else {
                yield {
                    type: type,
                    noteID: noteID,
                    start: urlStartPosition,
                    end: urlEndPosition,
                };
            }
        } else if (type == "npub") {
            const pubkey = PublicKey.FromBech32(content.slice(urlStartPosition, urlEndPosition + 1));
            if (pubkey instanceof Error) {
                // ignore
            } else {
                yield {
                    type: type,
                    pubkey: pubkey.hex,
                    start: urlStartPosition,
                    end: urlEndPosition,
                };
            }
        } else {
            yield {
                type: type,
                start: urlStartPosition,
                end: urlEndPosition,
            };
        }
    }
}

type otherItemType = "url" | "tag";
type ItemType = otherItemType | "note" | "npub";
export type ContentItem = {
    type: otherItemType;
    start: number;
    end: number;
} | {
    type: "npub";
    pubkey: string;
    start: number;
    end: number;
} | {
    type: "note";
    noteID: NoteID;
    start: number;
    end: number;
};

// Think of ChatMessage as an materialized view of NostrEvent
export interface ChatMessage {
    readonly event: PlainText_Nostr_Event;
    readonly type: "image" | "text";
    readonly created_at: Date;
    readonly lamport: number | undefined;
    content: string;
}

export function urlIsImage(url: string) {
    const trimmed = url.trim();
    const parts = trimmed.split(".");
    return ["png", "jpg", "jpeg", "gif", "webp"].includes(parts[parts.length - 1]);
}

export function* groupContinuousMessages<T>(
    seq: Iterable<T>,
    checker: (previousItem: T, currentItem: T) => boolean,
) {
    let previousItem: T | undefined;
    let group: T[] = [];
    for (const currentItem of seq) {
        if (previousItem == undefined || checker(previousItem, currentItem)) {
            group.push(currentItem);
        } else {
            yield group;
            group = [currentItem];
        }
        previousItem = currentItem;
    }
    yield group;
}

export function sortMessage(messages: MessageThread[]) {
    return messages
        .sort((m1, m2) => {
            if (m1.root.lamport && m2.root.lamport) {
                if (m1.root.lamport == m2.root.lamport) {
                    return m2.root.created_at.getTime() - m1.root.created_at.getTime();
                } else {
                    return m2.root.lamport - m1.root.lamport;
                }
            }
            return m2.root.created_at.getTime() - m1.root.created_at.getTime();
        });
}
