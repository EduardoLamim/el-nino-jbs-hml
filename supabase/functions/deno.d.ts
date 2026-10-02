// Declarações mínimas usadas pelo typecheck local; runtime de produção: Deno Edge.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
