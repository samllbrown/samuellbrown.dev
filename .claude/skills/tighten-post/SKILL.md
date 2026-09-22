---
name: tighten-post
description: The editing pass that cuts a samuellbrown.dev post down to the house length and makes every demo obvious to use. Load when Sam says a post is too long, "cut it down like the other ones", or that readers won't know what to do with a demo. Runs after blog-post, which sets the voice; this one sets the length and the demo recipe.
---

# Tightening a post

Load `blog-post` first for the voice rules. This skill is the pass that turns a first draft (typically
15 to 20 minutes of reading) into the shape of "Picking the puppy" and the blight post: 10 to 12
minutes, demo first, with the reader never having to guess what to press.

## Targets

- `readingTime` in `src/utils.ts` counts prose only. Aim for 10 to 12 minutes; the tightened
  Hopfield post went from 17 to about 10.
- Intro: two paragraphs at most, the question in the first sentence.
- One paragraph of reasoning before a demo, one after. If the after paragraph explains a mechanism it
  can be five sentences; if it reports what happened it should be two.
- Any paragraph carrying three or more numbers becomes a table, a `.fc-flow` tile row, a
  `.fc-methods` card row or a chart caption. Walk the post paragraph by paragraph and count.
- Findings sections ("The numbers"): each chart or table gets one sentence before it, saying what
  to look for, and at most two after. The caption carries the values.
- Limitations: four bullets, each a joined-up sentence. Drop the ones a careful reader would assume.
- Conclusion: `.fc-takeaways` cards (a headline number, one or two sentences, a tiny bar chart of the
  numbers behind it), then one closing sentence at most. No second reflection paragraph.
- Named things (rules, methods, variants) go in `.fc-methods` cards, one sentence each, rather than a
  paragraph per method.

## Making demos obvious

Every demo gets the same three things, in this order, so a reader who skims lands on the recipe:

1. **One sentence of what they're looking at**, before the widget: what the panels are, what the
   colours mean. Not how to use it.
2. **A "Try this" strip** directly above the widget, using the shared `.demo-steps` markup from
   `global.css`. Two to four numbered steps, each starting with the button to press in `<b>`, and
   saying what should happen. Markdown is not parsed inside the strip, so use `<b>` not `**`.

   ```html
   <div class="demo-steps"><span>Try this</span><ol>
     <li><b>Recall</b> and watch the sheep come back.</li>
     <li><b>Rub out half</b>, then Recall again.</li>
   </ol></div>
   ```

3. **A primary button.** The first action in the recipe gets `class="demo-primary"`. It keeps the
   post's own pill shape and only takes the accent border and text (the same look as a pressed
   button), styled once in `global.css` with a doubled class so it wins over the post's
   `.x-controls button` rule. Controls are ordered to match the recipe, advanced toggles
   (checkboxes, sliders) come last.

Also in the sim code:

- The idle status line says what to press next ("a scribbled-on sheep, 80 wrong. Press Recall.").
- The settled status line suggests the next step of the recipe ("settled after 4 sweeps. Now try
  Rub out half.").
- The first demo on a page autostarts once it scrolls into view, so the reader sees motion before
  they touch anything. Later demos wait.
- Button labels are verbs a person would say: Recall, Rub out half, Remember this, Run to 120. Not
  Execute, Apply, Submit.

## Process

1. Run the reading time: `node -e` over the post body with the same regex as `readingTime`, or load
   the page and read the meta line.
2. List every paragraph with three or more numbers and decide the graphic for each.
3. Cut in this order: repeated explanations, bridging sentences, the second reflection paragraph,
   bullets that restate the caption, then the long mechanism paragraphs down to what a graphic can't
   carry.
4. Add the demo strip and primary button to each demo, and check the sim's status strings.
5. Keep the figures and tables from the experiment script byte for byte; never retype a number.
6. Grep for `—`, `kill`, `cull`, and for bullets of short full-stopped sentences. Load the post
   from `/blog/` as well as directly so the demos mount both ways, and screenshot it at 1200 and
   390 wide.
