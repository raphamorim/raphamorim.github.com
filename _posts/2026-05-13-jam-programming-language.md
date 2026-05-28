---
layout: post
title: "Jam Programming Language"
language: 'en'
description: "A systems language with mutable value semantics, compile-time memory safety, and simplicity in mind."
---

Before I get into any of this: I’m not bashing any language. I have real respect for all of them. Every language has good things the others don’t, and there’s no such thing as a perfect language. As the creator of Rio Terminal, I’ve never said a negative word about another terminal, and I won’t say one here about another language either. Anyone spending their time trying to build something they believe in has my admiration. What follows is a take on tradeoffs, not on the people behind the work.

One more thing: Jam is still on its way to v1.0. The mechanics below are real and running in the compiler today, but specifics may change before the language stabilizes, so treat what's here as the current state and not the final form.

One more thing though: if you think learning a programming language in the age of LLMs is a waste of time, then this post isn't for you. Saying it up front so you can save some of yours.

Ok, all being said. Lemme start.

--

I love Rust. I really do. I've run Rust workshops. I've been the person who pioneered Rust adoption at a couple of the companies I've worked at. I have spent a lot of energy trying to bring teams along.

The problem is that Rust keeps getting more complicated. Don't take that the wrong way. Rust has a clear philosophy and is making the choices that philosophy demands. But in real-life work, on real teams, you want to ship things fast and you want the team committed to the language. The cliff between "I can write some Rust" and "I am productive in Rust" is steep enough that good engineers stall on it, and you spend months pulling them up.

This is why Zig has been striving lately. Zig keeps programmers close to C-like languages: small surface, immediate mental model, no syntactic noise. The joy of C without most of the C foot-cannons. The catch is that Zig isn't a safe language. Uninitialized reads, manual cleanup, nothing at the language level stopping a use-after-free. Zig leaves all of that in your hands and trusts you to be careful.

You can argue that's fine. A single experienced programmer working solo can hold the invariants in their head and is unlikely to ship a use-after-free. The problem is that real software is almost never that. Real software has dependencies, and a single CVE in any of them lands on you. Real teams mix experience levels, and the less senior end of the team makes mistakes more often. Look at big Zig or C++ projects in production: they lean heavily on Valgrind, AddressSanitizer, and fuzzing, running the same checks over the same flow over and over, sometimes inside dependencies the team doesn't own. That's the cost of unsafe-by-default. The verification work doesn't disappear; it gets pushed out of the language and into tools, CI, and postmortems. Software ends up less reliable in production and harder to maintain over time.

<figure class="post-figure">
  <img src="/assets/images/posts/jared-bun-rust-rewrite.webp" alt="Two tweets from Jarred Sumner explaining why he is migrating Bun from Zig to Rust: the new codebase lets the compiler enforce lifetimes and emit destructors, the unsafe parts look uglier and invite refactoring, and he is tired of fixing memory leaks, crashes, and stability issues that the language could have prevented." />
  <figcaption><a href="https://x.com/jarredsumner/status/2053048478486708562">Jarred Sumner</a>, creator of <a href="https://bun.sh/">Bun</a>, on rewriting Bun from Zig to Rust. Exactly the tax described above.</figcaption>
</figure>

In the age of AI, safety has become a must, or at least highly desirable. A lot of code in production today is written, or at least drafted, by something that isn't a human. I am not making a value judgement; it is just where we are. The shape of the bottleneck has shifted: ten years ago most folks would wrote code, now most of them review code. Ten years ago the compiler caught half the bugs and the human caught the other half; now the compiler has to catch all of them, because the human going line by line with full intent is gone or distracted. With code volume rising and review surface flat, the language has to be the one keeping things honest.

Safety, lower learning curve and high performance were the biggest reasons I started Jam programming language.

The question I've been working on: how do you keep the joyful, immediate feel of a C-like language (Go, Zig, modern C) while making the language safe without a garbage collector? How do you give people the C ergonomic without the C bug class? The compromise that fell out is a language that draws from four places. Today I'm focusing on two; the other two will get their own posts.

- **Mutable value semantics** as described in Racordon, Abrahams et al. 2022.[^mvs] Bindings own their values, parameter borrows live only for the duration of a single function call, and no reference or lifetime syntax appears anywhere in user code. This is what replaces the borrow checker.
- **Rust's drop system.** Types declare a `drop` function, the compiler synthesizes the call at every scope exit, and a small dataflow analysis catches use-of-uninitialized at compile time.

The result is a language where: Bindings own their values and resources clean themselves up, so every binding of a drop-bearing type fires its drop function automatically when the binding goes out of scope.

### Jam drop system

In Jam you write:

```rust
const File = struct {
    fd: i32,
    fn drop(self: mut File) {
        close(self.fd);
    }
};

export fn useFile() i32 {
    const f: File = { fd: 7 };
    return f.fd;
}
```

There is no explicit cleanup. No `defer`, no manual call, no syntax marking the end of `f`'s lifetime. The compiler synthesizes the drop call.

Here is the LLVM IR Jam emits for `useFile`:

```llvm
define i32 @useFile() #0 {
  %1 = alloca %File, align 4
  store %File { i32 7 }, ptr %1, align 4
  %2 = getelementptr inbounds nuw %File, ptr %1, i32 0, i32 0
  %3 = load i32, ptr %2, align 4
  call void @__drop_File(ptr %1)
  ret i32 %3
}
```

The `call void @__drop_File(ptr %1)` one line before the `ret` is the entire story (`%1` here is the alloca for the source-level binding `f`). The compiler tracked that `f` is a binding of a drop-bearing type, walked the function's drop scope on exit, and emitted the call automatically. The mangled name (`__drop_File` rather than `drop`) is what lets multiple types each have their own drop fn without colliding at the LLVM level. The pointer-passed `self` is the mode-aware ABI doing its job: the drop function takes `self: mut File`, which lowers as a `ptr` parameter, so the call site passes the binding's address directly and `drop` mutates the caller's storage for real.

The same program in Zig requires the programmer to remember the cleanup:

```zig
const File = struct {
    fd: i32,
    pub fn deinit(self: *File) void {
        _ = close(self.fd);
    }
};

export fn useFile() i32 {
    var f: File = .{ .fd = 7 };
    defer f.deinit();      // <-- the bit you must remember
    return f.fd;
}
```

The Zig compiler does not synthesize `defer` for you. Forget the line, and the file descriptor leaks. The IR shows the deinit call only because the source wrote `defer f.deinit()`:

```llvm
define dso_local i32 @useFile() #0 {
Entry:
  %0 = alloca %zig_demo.File, align 4
  ...
  store i32 7, ptr %8, align 4
  %10 = load i32, ptr %9, align 4
  call fastcc void @zig_demo.File.deinit(ptr %1, ptr nonnull align 4 %0)
  ret i32 %10
}
```

Remove the `defer` line and the call disappears with it. The terminal ergonomic is honest: in Zig, what you write is what you get.

C++ does what Jam does. Destructors run automatically on scope exit (RAII):

```cpp
struct File {
    int fd;
    ~File() { close(fd); }
};

extern "C" int useFile() {
    File f{7};
    return f.fd;
}
```

```llvm
define i32 @useFile() #0 {
  %1 = alloca %struct.File, align 4
  %3 = getelementptr inbounds nuw %struct.File, ptr %1, i32 0, i32 0
  store i32 7, ptr %3, align 4
  %4 = getelementptr inbounds nuw %struct.File, ptr %1, i32 0, i32 0
  %5 = load i32, ptr %4, align 4
  %6 = call noundef ptr @_ZN4FileD1Ev(ptr noundef nonnull align 4 dereferenceable(4) %1) #3
  ret i32 %5
}
```

The destructor `_ZN4FileD1Ev` runs unconditionally before the `ret`. So far, Jam and C++ are in the same camp on this axis.

The difference is everything else C++ piles around its destructors. The rule of 0/3/5 forces you to reason about copy and move whenever you write a destructor. Virtual destructors are needed for polymorphic deletion, easy to forget, and a leak when you do. A constructor that throws partially constructs an object whose own destructor never runs. Throwing from a destructor calls `std::terminate` (destructors are implicitly `noexcept(true)` since C++11, so any throw triggers it; mark one `noexcept(false)` and a throw during an in-progress unwind still terminates).

And C++ destructors aren't even a guarantee. `std::exit` doesn't run destructors of stack-resident objects (only static-storage ones). `std::abort` runs none at all. `longjmp` over a scope with non-trivial destructors skips them. An uncaught signal skips them. A constructor that throws skips the object's own destructor.

Rust threw most of this out: one `Drop::drop(&mut self)` per type, no copy or move constructors (moves are byte copies, no user code runs), no virtual marker to manage (trait objects handle polymorphic drop through the vtable's `drop_in_place` automatically), no slicing because there is no inheritance. Jam adopts that same model directly. A type has one drop function. It runs at every scope exit. No rule of five to learn, no virtual marker to forget, no exception-safety dance.

### Reading uninitialized memory

The Jam example built `f` with a struct literal: `const f: File = { fd: 7 };`. The Zig example used `.{ .fd = 7 }`. Both bindings carry a real value the moment they exist. That is not a stylistic choice. In Jam it is the only way; the keyword `undefined` doesn't exist.

Zig is different. You can declare a binding without a value:

```zig
var f: File = undefined;
return f.fd;            // UB at runtime; reads stack garbage
```

`undefined` is a Zig value of any type. The compiler accepts the read of `f.fd` because, statically, `f` has type `File`. At runtime, the storage holds whatever bytes were on the stack: `0xaa` in Debug mode (Zig's debug fill makes the misuse visible in a debugger), and arbitrary bytes in Release mode. Production code that wandered through an `undefined` read is just wrong. This is the deliberate Zig tradeoff: maximum power, programmer responsibility.

Go sits at the opposite end. Every `var` zero-initializes by default: `var x int` writes 0, `var p *T` writes nil, `var s SomeStruct` zeroes every field. Safety is great (no garbage reads), but `nil` and the zero pattern are still real bytes in memory, written on every declaration even when the next line is about to overwrite every field. Zig trades safety for cycles; Go trades cycles for safety; both pay something the program didn't actually need to pay.

Jam refuses the choice. There is no `undefined` value, no implicit zero, no way to declare a binding without giving it a real initializer. Every `var` and `const` requires one. If you need to build something incrementally, you use a struct literal: compute the field values first, construct the struct second, bind it third. Nothing in between holds an unspecified or placeholder value, and nothing is memset to zero just to be overwritten.

The two patterns where this would otherwise be awkward, *deferred initialization* (slot exists now, value comes later) and *out-parameters* (callee fills caller-owned storage), get a different mechanism: a wrapper type called `Maybe(T)`.

```zig
var slot: Maybe(File) = Maybe(File).empty();
slot.write(makeFile(...));
const f: File = slot.unsafeAssumeInit();
```

`Maybe(T)` is a regular generic struct with three operations: `empty()` constructs a slot whose contents are not yet meaningful, `write()` fills it, and `unsafeAssumeInit()` extracts the value. The naming carries the safety story. Every consume site contains the word `unsafe`, so reviewers (human and AI) can grep for it and find every place a runtime invariant is being asserted.

A lint pass tracks which slots have been written and rejects any `unsafeAssumeInit` call on a slot the analyzer can't prove was initialized. Misuse the API and the compiler errors, it doesn't compile. The `unsafe` prefix stays as the grep anchor for reviewers (human and AI) to find every place a runtime invariant is being asserted, but the obvious mistakes never make it past the analyzer.

### Block scopes, early returns, break, continue

Once auto-drop works at the function level, the rest follows mechanically. The compiler tracks a stack of drop scopes, pushes a new one at each lexical block boundary, and pops when the block ends, emitting drops for that scope's bindings just before the branch out:

- **Block scopes.** A binding declared inside an `if` body drops at the end of that body, before any code after the `if` runs. Same for `else`, `match` arms, `while` and `for` loop bodies.
- **Early returns.** A `return` inside a nested block drops every active scope, innermost first, before the actual ret instruction.
- **`break` / `continue`.** Both drop every scope opened inside the enclosing loop body (including any nested `if` scopes that were open at the time) before branching to the loop's exit (for `break`) or next iteration (for `continue`).

The rules are the rules you'd expect from RAII done well. They're enforced by the compiler. The IR contains exactly the drop calls those rules require, and no others.

A nested-break example, expressed in Jam:

```rust
const std = import("std");

const Bumper = struct {
    label: str,
    fn drop(self: mut Bumper) {
        std.fmt.println(self.label);
    }
};

fn nestedBreak() {
    for i in 0:10 {
        const outer: Bumper = { label: "outer" };
        if (i == 1) {
            const inner: Bumper = { label: "inner" };
            // break drops inner first, then outer, then exits.
            break;
        }
        // non-break iterations: outer drops at end of body.
    }
}
```

Running this prints three lines in this order: `outer` (iter 0's outer drops at the end of the loop body), then `inner` and `outer` (iter 1's break path drops innermost first).

### Passing values without dropping them

A natural question after all of that: if every binding drops when it goes out of scope, what happens when I pass it to a function? Does the call site drop it? Does the callee?

The answer is: it depends on the parameter mode, and only one of the four modes drops at all.

```rust
fn distance(a: Point, b: Point) f64 {
    const dx: f64 = a.x - b.x;
    const dy: f64 = a.y - b.y;
    return sqrt(dx * dx + dy * dy);
}

fn caller() {
    const p: Point = origin();
    const q: Point = elsewhere();
    const d: f64 = distance(p, q);
    // p and q are still init here. No drop ran at the call site.
}
```

The default mode is a read-only borrow. The callee gets to read the value through the parameter, the caller's binding stays init, and no drop fires when the call returns. `mut` is the same idea with write access added: an exclusive read-write borrow. The caller's binding survives the call unchanged in init state.

Only `move` consumes:

```rust
fn consume(buf: move []u8) {
    // buf is owned here. It drops at the end of consume.
}

fn caller() {
    var data: []u8 = makeBuffer();
    consume(data);
    // data is Uninit now. Reading it is a compile error.
    // The drop ran inside consume, not here.
}
```

The parameter mode in the signature decides what each call site does. There is no call-site marker. The call shape is identical for every mode:

| Mode | Callsite | Caller's binding after the call |
| --- | --- | --- |
| (default) read-only borrow | `f(x)` | unchanged, still init |
| `mut` exclusive borrow | `f(x)` | unchanged, still init |
| `move` consume | `f(x)` | becomes Uninit |

None of this exposes a first-class reference. There is no reference type in Jam: no value the borrow could attach to, nothing to store in a variable or return from a function or hold in a struct field. Parameter borrows are call-frame ephemera. The callee gets read or read-write access through the parameter, the access expires when the call returns, and that's it. Jam doesn't need lifetime annotations to make any of it safe, because there are no lifetimes to attach.

The same rule forces collection APIs to be value-shaped all the way down. There is no place expression a caller can hold, no way to grab the address of an element. Indexed assignment `v[i] = x` desugars to a setter call (`v.setAt(i, x)`) where the new value flows in by value and the collection writes through its own private storage. Indexed read `let y = v[i]` mirrors it through a getter (`v.at(i)`) that returns the element by value. Same constraint every layer down.

The same insight that powers Rust's borrow checker (shared XOR mutable) applies, but to *paths* at call sites instead of to first-class reference values:

```rust
fn moveX(p: mut Point, dx: f64) { p.x = p.x + dx; }
fn swap(a: mut f64, b: mut f64)  { /* ... */ }

fn ok() {
    var p: Point = origin();
    swap(p.x, p.y);   // OK: disjoint sub-paths
}

fn err() {
    var p: Point = origin();
    moveX(p, p.x);    // ERROR: `p` overlaps `p.x`
}
```

The exclusivity check runs at every call site over the borrow set produced by that site's arguments. There's no first-class reference for a lifetime to attach to, so there are no lifetimes to infer.

### Safe, and C-ABI compatible

Everything above is about the inside of a Jam program. The other half of real systems work is the boundary: shipping a library other people link against, loading a plugin at runtime, exposing an API that Python or Go or a C codebase calls. This is where Rust's safety story gets expensive.

Rust's native ABI is deliberately unstable. The layout of a `struct`, the order of enum discriminants, how a `Vec` or a `&str` is passed: all of it can change between compiler versions, and none of it is something another language, or even another independently built Rust binary, can rely on. So the moment you cross a distribution boundary you leave safe Rust behind and re-encode everything in C terms by hand:

```rust
pub struct Counter { value: i64 }

#[no_mangle]
pub extern "C" fn counter_new() -> *mut Counter {
    Box::into_raw(Box::new(Counter { value: 0 }))
}

#[no_mangle]
pub unsafe extern "C" fn counter_add(c: *mut Counter, n: i64) -> i64 {
    let c = &mut *c;          // unsafe: a raw pointer the compiler can't vouch for
    c.value += n;
    c.value
}

#[no_mangle]
pub unsafe extern "C" fn counter_free(c: *mut Counter) {
    drop(Box::from_raw(c));   // manual ownership hand-back, also unsafe
}
```

Look at what the safety model bought you and then handed back. The borrow checker, lifetimes, `Drop`: all of it stops at the `extern "C"` line. The pointer is raw, dereferencing it is `unsafe`, ownership crosses the boundary by hand through `Box::into_raw` / `Box::from_raw`, and `#[repr(C)]` (omitted here, but mandatory the moment a struct crosses by value) is a separate annotation you have to remember on every type. Tools like `cbindgen` and the `abi_stable` crate exist precisely because this boundary is so much manual work. The friction is real, and it scales with every type and every function you export.

Jam doesn't have this seam, because the thing that makes Rust's ABI unstable doesn't exist in Jam. There are no first-class references, no lifetimes, no niche-packed layouts to erase. A Jam value is value-shaped all the way down, the same property that made the collection APIs by-value earlier, so a Jam struct already *has* a C-compatible layout. There is nothing to translate.

The same `Counter`, exported from Jam:

```rust
const Counter = struct {
    value: i64,
    fn add(self: mut Counter, n: i64) i64 {
        self.value = self.value + n;
        return self.value;
    }
};

export fn counterAdd(c: mut Counter, n: i64) i64 {
    return c.add(n);
}
```

`export` puts `counterAdd` on the C calling convention under a plain, unmangled name, callable from C as:

```c
int64_t counterAdd(Counter *c, int64_t n);
```

The `mut Counter` parameter lowers to exactly that `Counter *`: the mode-aware ABI passes `mut` as a pointer to caller-owned storage, which is what a C caller already holds. No `repr` annotation, no raw-pointer cast, and crucially **no `unsafe`**. The body of `counterAdd` is ordinary Jam, so drop still fires, init analysis still runs, and the call-site exclusivity rule still holds. The safety doesn't stop at the boundary; the boundary is just another Jam function that happens to be reachable from C.

Calling *into* C is the mirror image. `extern` declares the C signature and you call it like any other function:

```rust
extern fn snprintf(buf: *mut[] u8, size: u64, fmt: *const[] u8, ...) i32;

fn render(value: i32) i32 {
    var buf: [16]u8 = [0; 16];
    return snprintf(&buf[0], 16, "n=%d", value);
}
```

One honest caveat: at the `extern` line you are talking to C, and C's rules win. `extern` functions follow the C ABI literally, so the parameter-mode machinery from the last section doesn't apply across that boundary, raw pointers (`*const[] u8`, `*mut[] u8`) are how you hand C a buffer, and what C does with that pointer is C's problem. Jam doesn't pretend to verify the far side of an FFI call. What it does give you is that *your* side stays safe by default, and exposing a Jam library across the C ABI costs nothing extra: no shim layer, no second unsafe API mirroring the safe one, no annotation tax on every type. You write the function once, safely, and `export` it.

That matters most exactly where Rust hurts most: distribution. A Jam library can ship as a C-ABI `.so` / `.dylib` / `.a` that any language can link, and the code you wrote to build it is the same safe code you'd have written for internal use.

### Pattern matching

A match in Jam looks like this:

```rust
match (opcode) {
    0x00                 { /* NOP */ }
    0x01 | 0x11 | 0x21   { ld16Imm(cpu, opcode); }
    0x40..=0x7F          { ldR8R8(cpu, opcode); }
    0x80..=0xBF          { aluR8(cpu, opcode); }
    0xCB                 { decodeCb(cpu); }
    _                    { unimplemented(opcode); }
}
```

The motivating use case was the opcode dispatcher in the Game Boy emulator I'm writing in Jam: 256 base opcodes plus 256 prefix opcodes.

A few syntax decisions worth calling out:

- **No `=>`.** Each arm is `Pattern Block`, with the braces serving as the body delimiter. V's spelling, not Rust's.
- **Parenthesized scrutinee.** Matches Jam's existing `if (...)` and `while (...)` shape.
- **`_` for the catch-all.** A wildcard arm at the bottom matches anything not handled above.
- **Sequential first-match.** Top-to-bottom, no implicit fallthrough between arms.

The same shape extends to enums with payloads:

```rust
const Op = enum {
    Nop,
    LdR8R8(u8, u8),
    Jp(u16),
};

match (op) {
    Op.Nop                { /* nothing */ }
    Op.LdR8R8(dst, src)   { regs[dst] = regs[src]; }
    Op.Jp(addr)           { cpu.pc = addr; }
}
```

The variant pattern matches by tag and binds the payload fields to fresh locals inside the arm. No catch-all is needed: the compiler checks exhaustiveness over the variant set and rejects any match that misses a variant. Add a new variant later and every match site that doesn't cover it stops compiling, with the type checker pointing at the exact line. That is the safety property pattern matching is for.

Match also works as an expression:

```rust
const name: []u8 = match (color) {
    Color.Red    { "red"   }
    Color.Green  { "green" }
    Color.Blue   { "blue"  }
};
```

Each arm's block produces a value (the value of its trailing expression), all arms must produce the same type, and the match must be exhaustive.

Under the hood, every match compiles through a single decision-tree pipeline based on Maranget 2008.[^maranget] For integer-literal cascades, LLVM's `simplifycfg` pass folds the chain into a `switch` and a jump table when profitable. The opcode dispatcher above lands as a jump table without the front-end having to emit `switch` itself.

### Compile time

There are two kinds of speed, and the section below is only about one of them. The other is how long you wait for the compiler. For the way people actually work, edit, build, run, edit again, dozens of times an hour, build latency is the number you feel most, and it's a number Rust has fought for its entire life.

It's worth being precise about *why* Rust compiles slowly, because it isn't an accident or a missing optimization. It's the pipeline. A function on its way to machine code passes through a [whole sequence of intermediate representations](https://rustc-dev-guide.rust-lang.org/overview.html):

```
tokens → AST → HIR → (type inference + trait solving)
       → THIR → MIR → (borrow check) → monomorphization → LLVM IR → machine code
```

Each arrow is a real lowering pass that allocates a fresh representation and walks the whole program. HIR is the desugared form type inference and trait solving run on (name resolution already ran earlier, on the AST); THIR is a fully typed, further-desugared form built specifically to construct MIR; MIR is where borrow checking, the uninitialized-value check, and mid-level optimization happen; then every generic is monomorphized (a fresh copy stamped out per concrete type) and handed to LLVM, which optimizes all of it again. Trait solving is a search problem. Borrow checking is a whole-function region analysis. Monomorphization multiplies the code volume before LLVM, the slowest stage, even sees it. None of this is waste from Rust's point of view; each pass buys a guarantee. But you pay for all of them on every build.

Jam's pipeline is shorter by construction:

```
tokens → AST → AstGen → JIR → codegen → LLVM IR → machine code
```

One typed intermediate representation (JIR) instead of three (HIR, THIR, MIR). JIR is typed from the moment AstGen produces it, because Jam has no comptime-as-values that would force an untyped lowering first, so there's no "resolve, then re-type" round trip. The analyses Rust spreads across HIR and MIR, the drop placement, the init-before-use check, and the call-site exclusivity rule from the earlier sections, all run as local dataflow passes over JIR rather than as a whole-program lifetime-and-region inference. And because Jam annotates a type at every binding, the front end does far less of the global type inference and open-ended trait search that dominate rustc's middle.

The implementation leans the same direction. The AST and JIR are *flat*: small fixed-size nodes packed in one contiguous array, indices instead of pointers, oversized payloads spilled into a side pool, so the compiler walks cache-friendly arrays with switch-on-tag dispatch instead of chasing a tree of heap-allocated nodes across memory. It's the data-oriented design Zig and Carbon adopted for the same reason, the compiler is itself a performance-sensitive program, and laying its data out well is most of the battle.

The one stage nobody escapes for free is the backend. LLVM produces excellent code and takes its time doing it, and in release builds that optimization work dominates the clock. The plan is the split the rest of the industry is converging on: Cranelift for debug builds, where the only goal is to reach a runnable binary as fast as possible, and LLVM for release builds, where you want every last optimization. (Cranelift is on the roadmap, not done yet.)

To be straight about where this stands: the compiler today is the C++ implementation that bootstraps the language, and I don't have build-time benchmarks worth quoting yet. The claim here is about design, not a finished number. But the design is the part you can't retrofit. A pipeline with one IR, local safety passes, and no trait solver has a structurally lower floor than one with three IRs, monomorphization, and a region-inferring borrow checker, and that floor is what fast builds are eventually built on.

### Speed

The goal is for Jam to match Rust and Zig on performance. There is no garbage collector, no managed-memory runtime, no per-allocation header to chase, and the codegen is straightforward LLVM IR, so the ceiling is in the right neighborhood by construction.

Jam is not there yet, though. Rust and Zig have both spent years on the things that move the last 10 to 30 percent: target-specific intrinsics in the standard library, careful auto-vectorization hints, allocator-aware container types, hand-tuned hot paths in core data structures, LLVM pass tuning, and a long tail of small wins that only show up once a language has a real userbase pushing on it. Jam will need that same work to fully close the gap, and it has barely started. On the workloads I have measured so far, Jam is close enough that the gap is "within a small constant factor" rather than "in a different class," which is the right starting place, but I do not want to oversell it as already matching.

Here is a very simple demo: a Tetris game for the terminal, built entirely in Jam.

<figure class="post-figure">
  <iframe width="85%" height="315" src="https://www.youtube.com/embed/A41iq7Hh8jw?si=Cx1oRrcTNzxkokHs" title="Tetris game built in Jam, running in a terminal" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
  <figcaption>A small Tetris implementation written in Jam, running in the terminal. <a href="https://tangled.org/rapha.land/tetris-jam">Source on Tangled</a>.</figcaption>
</figure>

### Where this is going

This post is more of a first conversation than a tour. There's plenty I didn't get to: the parameter mode system in real depth, the exclusivity rule, generics, Jam's own comptime, the standard library, allocator systems, the panic model, MLIR exploration for the GPU codegen pipeline (Chris Lattner, if you're by any chance reading this post, I am a big fan), the Rust ABI work for FFI, Cranelift, the path to a self-hosted compiler, and a handful of other things. Each will get its own post as the language settles.

Jam isn't public yet. The compiler exists and runs, but I'm holding the language back from a wider release while I work on the things that make it usable day to day: a stable surface, a package manager, an LSP, a formatter, the rest of the tooling you only notice when it isn't there. Shipping a language without that is shipping a sharp edge, and I'd rather take the time.

The plan for when to open source: once Jam has been used to build 108 distinct projects. Suikoden 2 is my favorite game, and the number 108 comes from there (the 108 Stars of Destiny you recruit through the story). It's an arbitrary milestone, but I like it. Right now it has gone out to a small group of users, and I'll keep widening the circle as the tooling catches up. Jam will be open source. There's no question about that. I just don't want to open it before it has been through enough real use to stand on its own.

If you want to kick the tires early, there's a beta list at [jamlang.org](https://jamlang.org/). More updates as the next pieces land.

[^mvs]: Dimi Racordon, Dave Abrahams, et al., "Implementation Strategies for Mutable Value Semantics", Journal of Object Technology, 2022. [Paper](https://research.google/pubs/mutable-value-semantics/).

[^maranget]: Luc Maranget, "Compiling Pattern Matching to Good Decision Trees", ACM SIGPLAN Workshop on ML, 2008. [PDF](http://moscova.inria.fr/~maranget/papers/ml05e-maranget.pdf).
