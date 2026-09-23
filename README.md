# Fix College Football

An in-browser toy for rearranging NCAA FBS conferences. Open a blank board, or start from a real season, then drag schools into conferences you can add, rename, recolor, and delete. The only score is how many listed rivalries you keep in the same conference.

The interaction is inspired by Lily Lavender’s [youTryItThen](https://lilylavender.github.io/youTryItThen/) ([source](https://github.com/LilyLavender/youTryItThen)), a browser toy for redrawing MLB divisions. That repository does not include a license file, so this project does not reuse its source. The code here is a separate implementation.

This site is not affiliated with the NCAA, any conference, or any school. Tiles are colored circles in school colors — primary fill, secondary border, school abbreviation — not official athletic marks.

The live site is [https://danolen.github.io/fix-college-football/](https://danolen.github.io/fix-college-football/).

## Run it

```bash
npm install
npm run dev
```

The dev server listens on port 47291. Open [http://127.0.0.1:47291](http://127.0.0.1:47291).

Your layout is stored in this browser only. There is no account and no link that opens someone else’s map.

## What’s in the box

- Build: presets, a flat list or Power and Group of X, an optional FCS picker, and drag-and-drop.
- Score: rivalries kept together, equal weight. Green and amber follow the same fractions as the inspiration (25/45 and 15/45) of the rivalries whose schools are both on the board.
- Share: once every conference other than Independents has at least two schools, download a grid image, download a map image, or post the text to X. Independents can have two, one, or none. The post is text only. The map can show every school or only assigned ones, and can color dots by conference or by school colors. Unassigned schools are gray in conference color mode. Each conference gets one faint blob that hugs the convex hull of its schools. The map is cropped to the continental United States. Scroll, a trackpad, or the plus and minus buttons zoom it, and dragging the map background pans it. Hawaiʻi stays in a fixed inset, not to scale.

School and rivalry data lives in `data/`. The map is drawn from Natural Earth lakes and public-domain country and state outlines in `public/geo/north-america.json`. No map API key.
