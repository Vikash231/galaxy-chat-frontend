import type { components, paths } from "./schema";

type Json<T> = T extends { content: { "application/json": infer B } } ? B : never;

export type Me = Json<paths["/api/v1/me"]["get"]["responses"][200]>;
export type ChatPage = Json<paths["/api/v1/chats"]["get"]["responses"][200]>;
export type Chat = ChatPage["items"][number];
export type ChatDetail = Json<paths["/api/v1/chats/{chatId}"]["get"]["responses"][200]>;
export type MessagePage = Json<paths["/api/v1/chats/{chatId}/messages"]["get"]["responses"][200]>;
export type Message = MessagePage["items"][number];
export type ContentBlock = Message["content"][number];
export type SendResult = Json<paths["/api/v1/chats/{chatId}/messages"]["post"]["responses"][202]>;
export type RealtimeAccess = SendResult["realtime"];
export type RunView = Json<paths["/api/v1/runs/{runId}"]["get"]["responses"][200]>;
export type RunMeta = components["schemas"]["RunMeta"];
export type StreamPart = components["schemas"]["StreamPart"];
export type ToolMeta = RunMeta["tools"][string];
export type Waitpoint = NonNullable<RunMeta["waitpoint"]>;
export type WaitpointAnswer = paths["/api/v1/waitpoints/{waitpointId}/answer"]["post"]["requestBody"]["content"]["application/json"];
