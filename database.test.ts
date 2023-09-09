import { Database_Contextual_View, EventsAdapter, Indices } from "./database.ts";
import { prepareNormalNostrEvent } from "./lib/nostr-ts/event.ts";
import { PrivateKey } from "./lib/nostr-ts/key.ts";
import { InMemoryAccountContext, NostrEvent, NostrKind } from "./lib/nostr-ts/nostr.ts";
import { assertEquals } from "https://deno.land/std@0.176.0/testing/asserts.ts";

const ctx = InMemoryAccountContext.New(PrivateKey.Generate());
const data = new Map();
const adapter: EventsAdapter = {
    delete() {},
    filter: async (f) => {
        return [];
    },
    get: async (keys: Indices) => {
        return data.get(keys.id);
    },
    put: async (e: NostrEvent) => {
        data.set(e.id, e);
    },
};

Deno.test("Database", async () => {
    const db = await Database_Contextual_View.New(adapter, ctx);

    const stream = db.subscribe();
    const event_to_add = await prepareNormalNostrEvent(ctx, 1, [], "1");
    await db.addEvent(event_to_add);
    assertEquals(
        db.events.map((e): NostrEvent => {
            return {
                content: e.content,
                created_at: e.created_at,
                id: e.id,
                kind: e.kind,
                pubkey: e.pubkey,
                sig: e.sig,
                tags: e.tags,
            };
        }),
        [event_to_add],
    );

    const e = await stream.pop() as NostrEvent;
    assertEquals(
        {
            content: e.content,
            created_at: e.created_at,
            id: e.id,
            kind: e.kind,
            pubkey: e.pubkey,
            sig: e.sig,
            tags: e.tags,
        },
        event_to_add,
    );

    const stream2 = db.subscribe();

    await db.addEvent(event_to_add); //   add a duplicated event
    assertEquals(db.events.length, 1); // no changes

    const event_to_add2 = await prepareNormalNostrEvent(ctx, 1, [], "2");
    // console.log(event_to_add2.id, event_to_add.id)
    await db.addEvent(event_to_add2);
    const e2 = await stream.pop() as NostrEvent;
    assertEquals(e2, await stream2.pop() as NostrEvent);
    assertEquals({
        content: e2.content,
        created_at: e2.created_at,
        id: e2.id,
        kind: e2.kind,
        pubkey: e2.pubkey,
        sig: e2.sig,
        tags: e2.tags,
    }, event_to_add2);
});