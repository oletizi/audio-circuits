# Tascam 38 schematic source acquisition status

Date: 2026-10-12
Status: **Source located and web-indexed; PDF binary not acquired. Analysis blocked on obtaining actual pages.**

## Exact source URLs

1. https://peel.dk/Archive/Tascam/Tascam%2038%20Complete%20schematics%20%28High%20quality%20scan%29.pdf — public directory listing advertises a 2.1 MB file.
2. https://manuals.plus/m/ae03866737e45d4a714f2ae747de858fec9e434b0d3a23d2c4691fe690f36b12.pdf — public indexed 12-page 9.9 MB schematic.
3. https://audiocircuit.dk/downloads/teac/Teac-Tascam38-int-sch.pdf — indexed 12-page schematic; direct link currently redirects to site home in web viewer.
4. https://www.audioservicemanuals.com/t/tascam/tascam-38/6435856-tascam-38-schematic — web page viewer for 12-page schematic.

## Attempted acquisition and results

- Web open on peel.dk and manuals.plus direct PDF URLs: inaccessible via web retrieval tool.
- Web open on audiocircuit.dk PDF: returned PDF metadata, but screenshot redirected to website home.
- Direct Python requests from container: DNS resolution failure.
- Container download of audiocircuit.dk PDF: download failed.
- No PDF bytes have been saved; therefore **no SHA-256 checksum is available** and there is **no locally usable authoritative drawing**.

## Next step

Acquire actual PDF bytes through a working acquisition path, verify PDF magic, page count and SHA-256, then store the file in a durable user-controlled location if licensing permits. Do not claim a verified pinout from indexed snippets. Retain original motherboard; design a compatible card first.

## Policy

A source URL, indexed text, or screenshot preview is not equivalent to a persisted PDF. Never mark acquisition complete until bytes and checksum are verified.
