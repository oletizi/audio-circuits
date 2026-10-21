Permitted-delta declarations, committed on purpose
==================================================

`parseDeclaredDeltas` checks PROVENANCE BEFORE CONTENT: a declaration whose text
is not the text git has at `HEAD` is refused before it is parsed at all. So
every malformed case the parser refuses needs a committed declaration to refuse,
and a fixture written into a temp directory could never reach the content checks.
That is why this directory holds one small committed file per case rather than
string literals inside the test.

`tests/schgen/gates/declared-delta.test.ts` declares the expected refusal beside
each file. A file here with no row there, or a row with no file, fails that test.
