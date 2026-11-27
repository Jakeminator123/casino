// The lab server's routes for the doll lab (dealer3d/page/docka.html). The server calls handleDollLab(req, res, url)
// before its own routes (tools/preview.ts); it answers true when the request was one of these.
//   GET /dealer3d/docka                    the page
//   GET /dealer3d/page/<name>.ts           the page's modules, and
//   GET /dealer3d/src/<name>.ts            the 3D lane's, and
//   GET /src/table-lens.ts                 the lens they rest on: each with its types taken off, under its own name (the
//                                          modules name their neighbours with .ts, as Node needs them)
//   GET /dealer3d/data/<name>.json         a motion of dealer3d/data/
//   GET /dealer3d/data                     the names of those motions ({names}), so that the page finds the standard
//                                          doll's own motions without asking for each
//   GET /dealer3d/plan                     Jakob's card plan (placements/default.json), read only
//   GET /dealer3d/figur/<kvinna|man>.glb   the standard doll's model as avatar-auto-pipeline builds it
//                                          (../avatar-auto-pipeline/assets/docka/, local media: 404 where it is not built,
//                                          and the page then draws the white figure)
//   GET /dealer3d/figur/<bord|stol>.glb    the standard room's table (its dealer's edge 15 cm nearer her) and stool
//                                          (assets/bord/standardbord_nara.glb, assets/stol/dealerstol.glb; 404 where they
//                                          are not built, and the page then draws the stage's own room)
//   GET /dealer3d/figur/bord23.glb         the table for the standard doll's own motions: its edge and tray 23 cm behind the
//                                          game's edge, the shoe, cards and places where they were
//                                          (assets/bord/standardbord_nara23.glb; the page takes it for the man and the woman,
//                                          as the editor of standarddocka/ does, and the older table where it is not built)
//   GET /dealer3d/figur/bordfilm.glb       the game's first table, its edge where the films have it (assets/bord/
//                                          standardbord.glb): drawn only while a dealer's film is laid over the doll
// Everything is read only: nothing under the repo is written by these routes.
// Imports nothing of dealer3d/src/, so that a module half way through a change there cannot stop the lab server.
import {readFile, readdir, stat} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import path from 'node:path';
import type {IncomingMessage, ServerResponse} from 'node:http';

/** The models handed out under /dealer3d/figur/, as avatar-auto-pipeline builds them (under its assets/). */
const MODELS: Record<string, string> = {kvinna: 'docka/standarddocka_kvinna.glb', man: 'docka/standarddocka_man.glb', bord: 'bord/standardbord_nara.glb', bord23: 'bord/standardbord_nara23.glb', bordfilm: 'bord/standardbord.glb', stol: 'stol/dealerstol.glb'};

export function dollLabRoutes(options: {root: string}) {
  const {root} = options;
  const send = (res: ServerResponse, status: number, type: string, body: string | Buffer) => { res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store'}).end(body); };
  const json = (res: ServerResponse, status: number, value: unknown) => send(res, status, 'application/json; charset=utf-8', JSON.stringify(value));
  const file = async (res: ServerResponse, relative: string, type: string, change: (text: string) => string = t => t) => {
    const text = await readFile(path.join(root, relative), 'utf8').catch(() => null);
    if (text === null) send(res, 404, 'text/plain; charset=utf-8', 'Finns inte.'); else send(res, 200, type, change(text.replace(/^﻿/, '')));
  };

  /** Answers true when the request was the doll lab's. */
  return async function handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
    const at = url.pathname, lab = at === '/dealer3d/docka' || at === '/dealer3d/plan' || at === '/src/table-lens.ts' || /^\/dealer3d\/(page|src|data|figur)(\/|$)/.test(at);
    if (!lab) return false;
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') { req.resume(); res.writeHead(405, {Allow: 'GET'}).end(); return true; }
      const script = /^\/dealer3d\/(page|src)\/([\w-]+)\.ts$/.exec(at), data = /^\/dealer3d\/data\/([\w-]+)\.json$/.exec(at), figure = /^\/dealer3d\/figur\/(kvinna|man|bord|bord23|bordfilm|stol)\.glb$/.exec(at);
      if (at === '/dealer3d/docka') await file(res, 'dealer3d/page/docka.html', 'text/html; charset=utf-8');
      else if (figure) {
        // The models are large (the table 35 MB): the browser may keep them and asks only whether they have changed. The
        // file is read whole before anything is answered, and its length is what was read: a model rebuilt or gone between
        // the look and the read is answered as it is then, never with a length the body does not have.
        const full = path.join(root, '..', 'avatar-auto-pipeline', 'assets', MODELS[figure[1]]), s = await stat(full).catch(() => null), tag = s && `"${s.size}-${Math.round(s.mtimeMs)}"`;
        const head = (size: number) => ({'Content-Type': 'model/gltf-binary', 'Content-Length': size, ETag: tag!, 'Cache-Control': 'no-cache'});
        if (!s) send(res, 404, 'text/plain; charset=utf-8', 'Finns inte.');
        else if (req.headers['if-none-match'] === tag) res.writeHead(304, {ETag: tag}).end();
        else if (req.method === 'HEAD') res.writeHead(200, head(s.size)).end();
        else { const model = await readFile(full).catch(() => null); if (!model) send(res, 404, 'text/plain; charset=utf-8', 'Finns inte.'); else res.writeHead(200, head(model.length)).end(model); } }
      else if (script) await file(res, `dealer3d/${script[1]}/${script[2]}.ts`, 'text/javascript; charset=utf-8', stripTypeScriptTypes);
      else if (at === '/src/table-lens.ts') await file(res, 'src/table-lens.ts', 'text/javascript; charset=utf-8', stripTypeScriptTypes);
      else if (data) await file(res, `dealer3d/data/${data[1]}.json`, 'application/json; charset=utf-8');
      else if (at === '/dealer3d/data') json(res, 200, {names: (await readdir(path.join(root, 'dealer3d', 'data'))).filter(n => /^[\w-]+\.json$/.test(n)).map(n => n.slice(0, -5)).sort()});
      else if (at === '/dealer3d/plan') await file(res, 'placements/default.json', 'application/json; charset=utf-8');
      else send(res, 404, 'text/plain; charset=utf-8', 'Finns inte.');
    } catch {
      if (!res.headersSent) json(res, 500, {error: 'Något gick fel hos dockan.'});
      else res.end();
    }
    return true;
  };
}

export const handleDollLab = dollLabRoutes({root: path.resolve(process.cwd())});
