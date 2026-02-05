// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
/// <reference types="svelte-clerk/env" />
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { Db } from '$lib/server/db';
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db?: Db;
			auth?: () => { userId?: string | null };
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				CLERK_SECRET_KEY?: string;
				DB: D1Database;
				ARTIFACTS?: R2Bucket;
				PUBLIC_R2_BASE_URL?: string;
				GOOGLE_CLIENT_ID?: string;
				GOOGLE_CLIENT_SECRET?: string;
				GOOGLE_TOKEN_ENCRYPTION_KEY?: string;
			};
		}
	}
}

export {};
