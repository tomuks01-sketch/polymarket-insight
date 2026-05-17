# Case study — The Calibration

A self-updating data analytics web property, built and shipped solo, on a
**£0 infrastructure budget**, running unattended 24/7.

**Live:** https://tomuks01-sketch.github.io/the-calibration/
**Code:** https://github.com/tomuks01-sketch/the-calibration

---

## The brief I set myself

Take messy public, keyless data sources and turn them into a clean, always-up-to-date
analytics site — with **no server, no database, no cloud bill, and no human pressing
"refresh"**. Treat honesty as a hard engineering constraint, not marketing.

## What was built

| Piece | Engineering substance |
|---|---|
| **Ingestion** | Read-only public APIs (Polymarket Gamma, CLOB price history, CoinGecko, Kalshi) + keyless Google-News RSS. Every outbound call timeout-bounded and **fail-open**: any single source failing degrades gracefully instead of breaking the site. |
| **Self-refresh** | GitHub Actions cron regenerates the snapshot every 30 minutes and redeploys — fully unattended. Job is timeout-capped; CI **fails loud** on invalid JSON rather than publishing it. |
| **Integrity layer** | Append-only, deduplicated, Brier-scored public ledger with atomic writes and a "refuse to publish a degraded/empty snapshot" guard. Wrong calls stay in the record permanently — by design. |
| **Cost** | £0. Static site on free GitHub Pages, free API tiers only, optional card-free LLM tier. No infrastructure to pay for or maintain. |
| **Process** | Test-driven changes (zero-dependency test suite), independent multi-agent code review, conventional commits, rebase-safe deploys. |

## Honest scope (what it is *not*)

It is an **analytics terminal**, not a prediction or betting tool. It makes no
profit claims and gives no advice. The raw market odds are a re-display of a public
source; the **original, defensible asset is the falsifiable public scored ledger** —
a transparent track record that accumulates with time. This honesty boundary was a
deliberate engineering decision, documented and enforced in code.

## Why this is a useful proof

It demonstrates the ability to:

- ship a **complete, live, self-running product** alone, end to end;
- engineer for **unattended reliability** (retries, fail-open, atomic writes,
  loud-failure CI) rather than happy-path demos;
- work to **zero-budget constraints** without sacrificing correctness;
- exercise **honest technical judgment** — including saying no to features that
  would look impressive but undermine the product.

## What I can build for you

Small, **self-maintaining data tools**: a dashboard, monitor, or report that pulls
from public or private APIs and keeps itself current — with no backend for you to
run and no recurring infrastructure cost. The same pattern proven here, applied to
your data.
