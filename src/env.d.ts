/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly GITHUB_TOKEN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare module "@pagefind/default-ui" {
	declare class PagefindUI {
		constructor(arg: unknown);
	}
}
