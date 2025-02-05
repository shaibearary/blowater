/** @jsx h */
import { Fragment, h } from "https://esm.sh/preact@10.11.3";
import { tw } from "https://esm.sh/twind@0.16.16";
import { EventBus } from "../event-bus.ts";

import { WebSocketReadyState } from "../lib/nostr-ts/websocket.ts";

import { signal } from "https://esm.sh/@preact/signals@1.2.1";

import {
    CenterClass,
    inputBorderClass,
    InputClass,
    LinearGradientsClass,
    NoOutlineClass,
} from "./components/tw.ts";
import { UI_Interaction_Event } from "./app_update.ts";
import KeyView from "./key-view.tsx";
import { InMemoryAccountContext, NostrAccountContext } from "../lib/nostr-ts/nostr.ts";
import { PrivateKey } from "../lib/nostr-ts/key.ts";
import {
    DividerBackgroundColor,
    ErrorColor,
    HoverButtonBackgroudColor,
    PrimaryTextColor,
    SuccessColor,
    TitleIconColor,
    WarnColor,
} from "./style/colors.ts";
import { RelayIcon } from "./icons2/relay-icon.tsx";
import { DeleteIcon } from "./icons2/delete-icon.tsx";
import { RelayConfig } from "./setting.ts";

export interface SettingProps {
    logout: () => void;
    relayConfig: RelayConfig;
    eventBus: EventBus<UI_Interaction_Event>;
    myAccountContext: NostrAccountContext;
}

const colors = {
    "Connecting": WarnColor,
    "Open": SuccessColor,
    "Closing": WarnColor,
    "Closed": ErrorColor,
};

export const Setting = (props: SettingProps) => {
    const relays = props.relayConfig.pool.getRelays().map(
        (r) => ({
            url: r.url,
            status: r.ws.status(),
        }),
    );
    let priKey: PrivateKey | undefined;
    const ctx = props.myAccountContext;
    if (ctx instanceof InMemoryAccountContext) {
        priKey = ctx.privateKey;
    }
    return (
        <div class={tw`max-w-[41rem] m-auto py-[1.5rem]`}>
            <div class={tw`px-[1rem] py-[1.5rem] ${inputBorderClass} rounded-lg mt-[1.5rem]`}>
                <RelaySetting
                    eventBus={props.eventBus}
                    relays={relays}
                    relayConfig={props.relayConfig}
                />
            </div>

            <div class={tw`px-[1rem] py-[0.5rem] ${inputBorderClass} rounded-lg mt-[1.5rem]`}>
                <KeyView
                    privateKey={priKey}
                    publicKey={props.myAccountContext.publicKey}
                />
            </div>
            <button
                class={tw`w-full p-[0.75rem] mt-[1.5rem] rounded-lg ${NoOutlineClass} text-[${PrimaryTextColor}] ${CenterClass} ${LinearGradientsClass}  hover:bg-gradient-to-l`}
                onClick={props.logout}
            >
                Logout
            </button>
        </div>
    );
};

const addRelayInput = signal("");
const error = signal("");
export function RelaySetting(props: {
    relays: {
        url: string;
        status: WebSocketReadyState;
    }[];
    relayConfig: RelayConfig;
    eventBus: EventBus<UI_Interaction_Event>;
}) {
    const relays = props.relays;

    const addRelay = async () => {
        const err = await props.relayConfig.addRelayURL(addRelayInput.value);
        if (err instanceof Error) {
            error.value = err.message;
        } else {
            error.value = "";
        }
        addRelayInput.value = "";
    };

    return (
        <Fragment>
            <p class={tw`text-[${PrimaryTextColor}] text-[1.3125rem] flex`}>
                <RelayIcon
                    class={tw`w-[2rem] h-[2rem] mr-[1rem]`}
                    style={{
                        stroke: TitleIconColor,
                    }}
                />
                Relays
            </p>
            <p class={tw`mt-[1.75rem] text-[${PrimaryTextColor}]`}>
                Add Relay
            </p>
            <div class={tw`mt-[0.5rem] flex`}>
                <input
                    autofocus={true}
                    onInput={(e) => {
                        addRelayInput.value = e.currentTarget.value;
                    }}
                    value={addRelayInput.value}
                    placeholder="wss://"
                    type="text"
                    class={tw`${InputClass}`}
                />
                <button
                    class={tw`ml-[0.75rem] w-[5.9375rem] h-[3rem] p-[0.75rem] rounded-lg ${NoOutlineClass} text-[${PrimaryTextColor}] bg-[${DividerBackgroundColor}] hover:bg-[${HoverButtonBackgroudColor}] ${CenterClass}`}
                    onClick={addRelay}
                >
                    Add
                </button>
            </div>
            {error.value
                ? <p class={tw`mt-2 text-[${ErrorColor}] text-[0.875rem]`}>{error.value}</p>
                : undefined}
            <ul class={tw`mt-[1.5rem]`}>
                {relays.map((r) => {
                    return (
                        <li
                            class={tw`w-full px-[1rem] py-[0.75rem] rounded-lg bg-[${DividerBackgroundColor}80] mb-[0.5rem] text-[${PrimaryTextColor}] flex items-center justify-between`}
                        >
                            <div class={tw`flex items-center flex-1 overflow-hidden`}>
                                <span
                                    class={tw`bg-[${
                                        colors[r.status]
                                    }] text-center block py-1 px-2 rounded text-[0.8rem] mr-2 font-bold`}
                                >
                                    {r.status}
                                </span>
                                <span class={tw`truncate`}>{r.url}</span>
                            </div>

                            <button
                                class={tw`w-[2rem] h-[2rem] rounded-lg bg-transparent hover:bg-[${DividerBackgroundColor}] ${CenterClass} ${NoOutlineClass}`}
                                onClick={async () => {
                                    const err = await props.relayConfig.removeRelay(r.url);
                                    if (err instanceof Error) {
                                        error.value = err.message;
                                    }
                                }}
                            >
                                <DeleteIcon
                                    class={tw`w-[1rem] h-[1rem]`}
                                    style={{
                                        stroke: ErrorColor,
                                    }}
                                />
                            </button>
                        </li>
                    );
                })}
            </ul>
        </Fragment>
    );
}
