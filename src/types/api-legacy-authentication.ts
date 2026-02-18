import * as z from 'zod'
import { camelizeSchema } from '@/utils/zod'

export interface ApiV3LoginIdentifierUser {
    type: 'm.id.user';
    user: string;
}

export interface ApiV3LoginIdentifierThirdParty {
    type: 'm.id.thirdparty';
    medium: string;
    address: string;
}

export interface ApiV3LoginIdentifierPhone {
    type: 'm.id.phone';
    country: string;
    phone: string;
}

export interface ApiV3LoginRequestPassword {
    type: 'm.login.password';
    identifier: ApiV3LoginIdentifierUser | ApiV3LoginIdentifierThirdParty | ApiV3LoginIdentifierPhone,
    password: string;
    device_id?: string;
    session?: string;
}

export interface ApiV3LoginRequestRecaptcha {
    type: 'm.login.recaptcha';
    response: string;
    session?: string;
}

export interface ApiV3LoginRequestEmailIdentity {
    type: 'm.login.email.identity';
    threepid_creds: {
        sid: string;
        client_secret: string;
        id_server: string;
        id_access_token: string;
    };
    session?: string;
}

export interface ApiV3LoginRequestMsisdn {
    type: 'm.login.msisdn';
    threepid_creds: {
        sid: string;
        client_secret: string;
        id_server: string;
        id_access_token: string;
    };
    session?: string;
}

export interface ApiV3LoginRequestDummy {
    type: 'm.login.dummy';
    session?: string;
}

export interface ApiV3LoginRequestApplicationService {
    type: 'm.login.application_service';
    identifier: ApiV3LoginIdentifierUser;
}

export interface ApiV3LoginRequestToken {
    type: 'm.login.token';
    token: string;
}

export const ApiV3LoginResponseSchema = camelizeSchema(z.object({
    access_token: z.string(),
    device_id: z.string(),
    expires_in_ms: z.number().optional(),
    home_server: z.string().optional(),
    refresh_token: z.string().optional(),
    user_id: z.string(),
    well_known: z.object({
        'm.homeserver': z.object({
            base_url: z.url(),
        }),
        'm.identity_server': z.object({
            base_url: z.url(),
        }).optional(),
    }).optional(),
}))

export type ApiV3LoginResponse = z.infer<typeof ApiV3LoginResponseSchema>

export const ApiV3LoginFlowsSchema = camelizeSchema(z.object({
    flows: z.array(
        z.object({
            type: z.string(),
            get_login_token: z.boolean().optional(),
        })
    )
}))

export type ApiV3LoginFlows = z.infer<typeof ApiV3LoginFlowsSchema>

export interface ApiV3RefreshLoginRequest {
    refresh_token: string;
}

export const ApiV3RefreshLoginResponseSchema = camelizeSchema(z.object({
    access_token: z.string(),
    expires_in_ms: z.number().optional(),
    refresh_token: z.string().optional(),
}))

export type ApiV3RefreshLoginResponse = z.infer<typeof ApiV3RefreshLoginResponseSchema>

export interface ApiV3RegisterRequest {
    auth?: {
        session?: string;
        type?: string;
    };
    device_id?: string;
    inhibit_login?: boolean;
    initial_device_display_name?: string;
    password?: string;
    refresh_token?: boolean;
    username?: string;
}

export const ApiV3RegisterResponseSchema = camelizeSchema(z.object({
    access_token: z.string().optional(),
    device_id: z.string().optional(),
    expires_in_ms: z.number().optional(),
    home_server: z.string().optional(),
    refresh_token: z.string().optional(),
    user_id: z.string(),
}))

export type ApiV3RegisterResponse = z.infer<typeof ApiV3RegisterResponseSchema>

export const ApiV3RegisterFlowsSchema = camelizeSchema(z.object({
    completed: z.array(z.string()).optional(),
    flows: z.object({
        stages: z.array(z.string()),
    }),
    params: z.record(z.string(), z.record(
        z.string(), z.any(),
    )).optional(),
    session: z.string().optional(),
}))

export type ApiV3RegisterFlows = z.infer<typeof ApiV3RegisterFlowsSchema>
