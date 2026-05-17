"""Minimal moat-math guards. No pytest dependency (zero-dep project):
run with `python tests/test_core.py`. Covers the integrity-critical core:
model bounds, ledger dedup, terminal-outcome mapping.
"""

import json
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "src"))

from generate_snapshot import (  # noqa: E402
    MIN_EVENTS_TO_PUBLISH,
    _atomic_write_json,
    enough_events,
)
from ledger import _terminal_outcome, open_calls, resolve_pending  # noqa: E402
from model import evaluate  # noqa: E402


def test_model_bounds() -> None:
    # Extreme inputs must still clamp into [0.02, 0.98] or be ineligible.
    for mp, wk, liq, days in [
        (0.50, 0.9, 100000, 30),   # huge upward week move
        (0.50, -0.9, 100000, 30),  # huge downward
        (0.06, 0.5, 6000, 10),     # near the low edge
        (0.94, -0.5, 6000, 10),    # near the high edge
    ]:
        r = evaluate(mp, wk, liq, days, "0xcond")
        assert r.model_prob is None or 0.02 <= r.model_prob <= 0.98, r
    # Guards: near-certain / illiquid / bad-horizon must be ineligible.
    assert evaluate(0.99, 0.0, 100000, 30, "x").eligible is False
    assert evaluate(0.5, 0.0, 100, 30, "x").eligible is False
    assert evaluate(0.5, 0.0, 100000, 0, "x").eligible is False
    assert evaluate(0.5, 0.0, 100000, 30, "").eligible is False


def test_ledger_dedup() -> None:
    led = {"version": 1, "entries": []}
    cand = [{"conditionId": "0xAAA", "marketId": "m", "eventSlug": "s",
             "eventTitle": "t", "category": "c", "question": "q?",
             "modelProb": 0.6, "marketProb": 0.5, "divergence": 0.1}]
    assert open_calls(led, cand) == 1
    assert open_calls(led, cand) == 0          # same conditionId -> no dup
    assert len(led["entries"]) == 1


def test_terminal_outcome() -> None:
    assert _terminal_outcome({"closed": True, "outcomePrices": ["0.999", "0.001"]}) == 1
    assert _terminal_outcome({"closed": True, "outcomePrices": ["0.001", "0.999"]}) == 0
    assert _terminal_outcome({"closed": True, "outcomePrices": ["0.5", "0.5"]}) is None
    assert _terminal_outcome({"closed": False, "outcomePrices": ["1", "0"]}) is None


def test_enough_events_guard() -> None:
    # Too few events must be rejected so a broken upstream never publishes
    # an empty/truncated board as if the pipeline were healthy.
    assert enough_events(list(range(MIN_EVENTS_TO_PUBLISH))) is True
    assert enough_events(list(range(MIN_EVENTS_TO_PUBLISH + 5))) is True
    assert enough_events([]) is False
    assert enough_events(list(range(MIN_EVENTS_TO_PUBLISH - 1))) is False


def test_atomic_write_json() -> None:
    payload = {"a": 1, "nested": {"b": [1, 2, 3]}, "u": "ąčę"}
    with tempfile.TemporaryDirectory() as d:
        target = pathlib.Path(d) / "out.json"
        _atomic_write_json(target, payload)
        assert json.loads(target.read_text(encoding="utf-8")) == payload
        # No stray temp file left behind after a successful swap.
        assert not (pathlib.Path(d) / "out.json.tmp").exists()
        # Overwrite path also works (replace, not append).
        _atomic_write_json(target, {"a": 2})
        assert json.loads(target.read_text(encoding="utf-8")) == {"a": 2}


def test_resolve_pending_budget() -> None:
    # An already-expired budget must short-circuit BEFORE any network call
    # and leave PENDING entries untouched (retried next run).
    led = {"version": 1, "entries": [
        {"conditionId": "0xPEND", "status": "PENDING", "openedAt": "2099-01-01",
         "modelProb": 0.6, "crowdProbAtCallTime": 0.5},
    ]}
    resolved, voided = resolve_pending(led, budget_s=-1.0)
    assert (resolved, voided) == (0, 0)
    assert led["entries"][0]["status"] == "PENDING"
    # No-pending case still returns cleanly (regression guard).
    assert resolve_pending({"version": 1, "entries": []}) == (0, 0)


if __name__ == "__main__":
    test_model_bounds()
    test_ledger_dedup()
    test_terminal_outcome()
    test_enough_events_guard()
    test_atomic_write_json()
    test_resolve_pending_budget()
    print("ALL CORE TESTS PASSED")
