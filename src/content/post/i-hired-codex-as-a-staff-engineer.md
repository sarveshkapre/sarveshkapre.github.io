---
title: "I Hired Codex as a Staff Engineer"
description: "How I run Codex with high agency through Clone, with memory, CI feedback loops, and portfolio-scale execution."
publishDate: 2026-02-09
tags: ["clone", "codex", "automation", "engineering"]
---

Today, Codex is effectively maintaining my GitHub portfolio on autopilot. It runs with high agency: it picks the next piece of work, proposes improvements, implements them, checks CI, fixes breakages, and moves on, often for 16+ hours straight, while giving me standup-style updates on what changed and why.

In this post, I will break down the setup that makes this possible.

It is relatively straightforward, and I make this happen through [Clone](https://github.com/sarveshkapre/clone).

Codex has excellent taste and can operate like a Staff+ engineer over long horizons. It is not just "smart" in the moment. It is reliably productive: it ships code that usually works, catches its own mistakes, and keeps moving without needing constant steering.

But that reliability is not magic. The biggest unlock is giving it the same things you would give a real engineer: a stable contract, a clear memory system, and a feedback loop that punishes bad output. If you make `AGENTS.md` mostly immutable (only allowing edits to a small "Repo Facts" section), Codex stops thrashing and starts behaving consistently. If `PROJECT_MEMORY.md` has a strict schema (Decision, Why, Evidence, Commit, Confidence, Follow-up), you get continuity across days and runs instead of the agent "rediscovering" the same truths. If you track mistakes in `INCIDENTS.md` with a short RCA and a prevention rule, failures stop being random. They become training data for the system.

The other trick is restraint: update memory only when something meaningful happens (failed CI, reverted commit, an architecture decision, a production-impact fix). Otherwise you drown in noise. And if you add compaction, summarize old memory weekly and archive it, you avoid the slow death of every agent system: context bloat.

Do that, and you stop using Codex like a clever autocomplete. You start using it like an engineer who can execute, learn, and compound improvements over time, because the environment you built makes good behavior the default.

The moment it clicked for me was not a benchmark or a demo. It was the daily grind. I would start with a rough idea and it would come back with feature suggestions I had not considered. It would spot issues, one-shot fixes, clean up code, and keep momentum without me micromanaging every step. And then I noticed something slightly embarrassing: I was sitting there typing "continue" like I was the bottleneck in a system that could already think and execute.

So I asked a simpler question: if it can do the work, why am I still operating it like a chat assistant?

That question became **Clone**.

Clone is an autonomous orchestrator that lets Codex run like an actual engineer, one that owns outcomes, not a model waiting for my next prompt. Its job is concrete: manage, improve, and ship across **79 tracked repositories** on my GitHub. This is not "AI writing random code." This is delegated ownership with guardrails.

I still own direction. Codex owns the grind. And every cycle moves the portfolio forward.

Here is what I mean by "cycle," because this is where most people misunderstand these systems. Clone is not "run a prompt, make a commit, stop." It is **pass/cycle-based**. A cycle is a full sweep: refresh the repo queue, open a session for each repo, do real work, capture telemetry, then move on. Each repo session is **task-capped**, up to **10 tasks** (often fewer). If there is no high-signal work, it stops early. And by default, it is meant to run indefinitely: the time limit is effectively "off" unless I set it, and the thing that actually bounds a run is the number of cycles I choose to execute.

That design decision matters because it changes the feel completely. It stops being "a tool I am driving" and starts being "a system that keeps moving even when I am not watching."

The loop itself is intentionally boring, in a good way. It discovers repos to work on (recently active plus "pinned" repos I always want included), reads the repo objective and current state, inspects docs and TODOs, checks my issues and trusted bot signals, looks at CI, chooses the highest-impact next changes, implements + tests + documents, pushes to `main`, and repeats. You can summarize the whole thing as: discovery -> plan -> code -> test -> push -> feedback -> repair -> repeat.

But the reason it works is not the loop. The reason it works is the set of boring engineering constraints around the loop.

First, work has to be machine-enumerated. I did not want "what should I work on next?" to be a human decision repeated 79 times. Clone makes the queue explicit and refreshable. It also supports persistent pinned tracking so important repos do not fall out of rotation just because I have not touched them recently.

Second, safety has to be real, not aspirational. The simplest failure mode in these orchestrators is concurrency chaos: two workers touch the same repo and you get a mess. Clone avoids that with a **per-repo safety lock** so no two workers can run the same repo concurrently, plus **dedupe** so duplicate repo paths do not sneak into a cycle. That sounds small, but it is the difference between "parallelism" and "race conditions."

Third, the system needs a correctness signal that is not vibes. This is the strongest part of the whole project: **CI self-healing**. After each push, Clone waits for GitHub Actions on the exact commit. If CI fails, it pulls the failure logs, runs a targeted "fix CI" pass with that context, commits, pushes, and retries, bounded by a max attempt budget. CI is not just observed; it is used as a closed-loop feedback mechanism. That is when the agent stops feeling like a generator and starts feeling like an engineer: it ships, it breaks, it reads the failure, it fixes, it re-ships.

Then there is the part that most "agent demos" skip: memory.

If you want long-horizon work, you need the system to remember what it decided and why, not just what happened to be in the last prompt. Clone has a structured repo memory system that makes the agent behavior durable:

* `AGENTS.md` acts like a stable contract: how this repo should be treated.
* `PROJECT_MEMORY.md` is structured, evolving memory (with decision/evidence/trust labels).
* `INCIDENTS.md` captures failures, root cause, and prevention.

And because memory naturally grows until it becomes noise, Clone also does **memory compaction**. When `PROJECT_MEMORY.md` gets too large, it auto-compacts older material into `.clone_memory_archive/` so the "working set" stays clean and the agent stays fast. This is one of those details that looks boring on paper and feels magical in practice: the system does not just accumulate context, it curates it.

Security-wise, you also have to assume repos are hostile inputs. If you let an agent blindly consume GitHub issues from anyone, you have built a prompt-injection machine. Clone hardens against the obvious version of that: it prioritizes **my issues** and trusted bots, and ignores issues from other users. It is not perfect security, but it closes the most common injection vector without losing the utility of "issues as work."

And then there is a feature that changed the scope of what the system can do: it is not only a maintenance loop anymore, it is an **idea incubator**.

Clone has an `ideas.yaml` pipeline with a `process_ideas.sh` flow that can take a raw idea, bootstrap a brand-new project, create the repo (including private repo creation via `gh`), scaffold it, and auto-enroll it into `repos.yaml` so it immediately becomes part of the autonomous loop. That means the system can go from "I have an idea" to "repo exists and is improving itself" without me doing the boring setup work. Once you have experienced that end-to-end, it is hard to go back.

Finally, autonomy without visibility is just delegating risk. So the system is heavily instrumented: a human run log, JSONL event telemetry, status snapshots, per-worker status (in parallel mode), and per-pass logs. When something goes wrong, I can inspect the run like I would inspect any real system: what did it decide, why did it decide it, what changed, what failed, what happened next. Debuggability is not a nice-to-have here, it is what makes autonomy usable.

There is an honest tradeoff in all of this. Clone is optimized for velocity and ownership right now. It pushes directly to `main`, runs with permissive settings, and prioritizes throughput across many repos. That is intentional, but it is also not how you would run mission-critical production code in a company.

If I wanted stricter governance, the next layer is policy gates before push: PR-required mode, secret scanning and forbidden paths, required test matrices, change-budget guardrails, allowlists per repo. In other words: keep the autonomy, tighten the rails.

But even in its current form, this is the closest thing I have felt to "hiring" an engineer for outcome-driven work. Not autocomplete. Not a chat toy. A loop that owns execution, learns from CI, remembers what it is doing, and keeps moving across a portfolio.

I define goals and constraints. Codex handles execution and iteration at scale. And my repos get better whether or not I am actively staring at a terminal.

That was the whole point of building Clone in the first place.
