import * as z from 'zod'
import { camelizeSchema } from '@/utils/zod'

export interface ApiLoginIdentifierUser {
    type: 'm.id.user';
    user: string;
}

export interface ApiLoginIdentifierThirdParty {
    type: 'm.id.thirdparty';
    medium: string;
    address: string;
}

export interface ApiLoginIdentifierPhone {
    type: 'm.id.phone';
    country: string;
    phone: string;
}

export interface ApiLoginRequestPassword {
    type: 'm.login.password';
    identifier: ApiLoginIdentifierUser | ApiLoginIdentifierThirdParty | ApiLoginIdentifierPhone,
    password: string;
    device_id?: string;
    session?: string;
}

export interface ApiLoginRequestRecaptcha {
    type: 'm.login.recaptcha';
    response: string;
    session?: string;
}

export interface ApiLoginRequestEmailIdentity {
    type: 'm.login.email.identity';
    threepid_creds: {
        sid: string;
        client_secret: string;
        id_server: string;
        id_access_token: string;
    };
    session?: string;
}

export interface ApiLoginRequestMsisdn {
    type: 'm.login.msisdn';
    threepid_creds: {
        sid: string;
        client_secret: string;
        id_server: string;
        id_access_token: string;
    };
    session?: string;
}

export interface ApiLoginRequestDummy {
    type: 'm.login.dummy';
    session?: string;
}

export interface ApiLoginRequestApplicationService {
    type: 'm.login.application_service';
    identifier: ApiLoginIdentifierUser;
}

export interface ApiLoginRequestToken {
    type: 'm.login.token';
    token: string;
}

export const ApiLegacyLoginResponseSchema = camelizeSchema(z.object({
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
    }),
}))

export type ApiLegacyLoginResponse = z.infer<typeof ApiLegacyLoginResponseSchema>

export const ApiLoginFlowsSchema = camelizeSchema(z.object({
    flows: z.array(
        z.object({
            type: z.string(),
            get_login_token: z.boolean().optional(),
        })
    )
}))

export type ApiLoginFlows = z.infer<typeof ApiLoginFlowsSchema>


export interface ApiRegisterRequest {
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

export const ApiRegisterFlowsSchema = camelizeSchema(z.object({
    completed: z.array(z.string()).optional(),
    flows: z.object({
        stages: z.array(z.string()),
    }),
    params: z.record(z.string(), z.record(
        z.string(), z.any(),
    )).optional(),
    session: z.string().optional(),
}))

export type ApiRegisterFlows = z.infer<typeof ApiRegisterFlowsSchema>
