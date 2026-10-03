import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CARDS } from "../../src/site/advertising-products/catalog.mjs";
import { advertisingSpacing, columnsForWidth, computeAdvertisingPhotoGeometry } from "../../src/site/advertising-products/layout-core.mjs";

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is within ${tolerance} of ${expected}`);
};

const measuredViewports = [
  { layoutViewportWidth: 310, viewportHeight: 740, headerHeight: 72.59375 },
  { layoutViewportWidth: 380, viewportHeight: 844, headerHeight: 72.59375 },
  { layoutViewportWidth: 834, viewportHeight: 390, headerHeight: 132.78125 },
  { layoutViewportWidth: 810, viewportHeight: 1180, headerHeight: 132.78125 },
  { layoutViewportWidth: 1024, viewportHeight: 768, headerHeight: 85.390625 },
  { layoutViewportWidth: 1329, viewportHeight: 912, headerHeight: 102.515625 },
  { layoutViewportWidth: 2560, viewportHeight: 1440, headerHeight: 102.515625 },
];

const base = {
  layoutViewportWidth: 1329,
  viewportHeight: 1400,
  columns: 4,
  headerHeight: 100,
  imageWidth: 1000,
  imageHeight: 1000,
};

test("uses span min(3, N) and ignores the old 1.80 ratio boundary", () => {
  const belowBand = computeAdvertisingPhotoGeometry({ ...base, imageWidth: 1799 });
  const atBand = computeAdvertisingPhotoGeometry({ ...base, imageWidth: 1800 });
  const aboveBand = computeAdvertisingPhotoGeometry({ ...base, imageWidth: 1801 });

  assert.equal(belowBand.mode, "split");
  assert.equal(belowBand.span, 3);
  assert.equal(atBand.mode, "split");
  assert.equal(atBand.span, 3);
  assert.equal(aboveBand.mode, "split");
  assert.equal(aboveBand.span, 3);

  const sparse = computeAdvertisingPhotoGeometry({ ...base, columns: 1, imageWidth: 2000 });
  assert.equal(sparse.span, 1);
  const narrow = computeAdvertisingPhotoGeometry({ ...base, columns: 2, imageWidth: 1000 });
  assert.equal(narrow.span, 2, "narrow grids clamp D10 span to N=2");
});

test("uses the approved 220px grid target without decreasing columns on wider viewports", () => {
  const cases = [
    [719, 2], [720, 3], [721, 3], [750, 3], [751, 3], [960, 3], [961, 3],
    [1004, 3], [1005, 4], [1006, 4], [1200, 4], [1201, 4],
  ];
  let previous = 0;
  for (const [width, expected] of cases) {
    const columns = columnsForWidth(width);
    assert.equal(columns, expected, `${width}px`);
    assert.ok(columns >= previous, `${width}px never decreases the column count`);
    previous = columns;
  }
});

test("splits a three-column desktop primary into a two-column hero and one-column info", () => {
  const geometry = computeAdvertisingPhotoGeometry(base);

  assert.equal(geometry.mode, "split");
  assert.equal(geometry.span, 3);
  closeTo(geometry.width, 935.5);
  closeTo(geometry.imageZoneWidth, 612);
  closeTo(geometry.descriptionWidth, 288.5);
  closeTo(geometry.internalGap, 35);
  closeTo(geometry.height, geometry.heightCap);
});

test("full-span landscape primary ends after its width-fitted image and natural description", () => {
  const geometry = computeAdvertisingPhotoGeometry({
    layoutViewportWidth: 390, viewportHeight: 800, columns: 1,
    headerHeight: 72.59375, imageWidth: 2000, imageHeight: 1000,
    descriptionHeight: 120,
  });
  assert.equal(geometry.mode, "pinterest");
  closeTo(geometry.width, 360);
  closeTo(geometry.descriptionHeight, 120);
  closeTo(geometry.imageZoneHeight, 180);
  closeTo(geometry.height, 315);
  closeTo(geometry.imageWidth, geometry.imageZoneWidth);
  closeTo(geometry.imageHeight, geometry.imageZoneHeight);
  assert.equal(geometry.hasContainOverflow, false);
});

test("full-span portrait primary caps height and leaves side overflow only", () => {
  const geometry = computeAdvertisingPhotoGeometry({
    layoutViewportWidth: 390, viewportHeight: 800, columns: 1,
    headerHeight: 72.59375, imageWidth: 400, imageHeight: 1000,
    descriptionHeight: 120,
  });
  closeTo(geometry.height, 800 - geometry.top);
  closeTo(geometry.imageZoneHeight, 800 - geometry.top - 120 - geometry.internalGap);
  closeTo(geometry.imageHeight, geometry.imageZoneHeight);
  assert(geometry.imageWidth < geometry.imageZoneWidth);
  assert.equal(geometry.hasContainOverflow, true);
});

test("full-span long description uses the 28 percent viewport ceiling without inner stretch", () => {
  const geometry = computeAdvertisingPhotoGeometry({
    layoutViewportWidth: 390, viewportHeight: 800, columns: 1,
    headerHeight: 72.59375, imageWidth: 2000, imageHeight: 1000,
    descriptionHeight: 600,
  });
  assert(geometry.descriptionHeight + geometry.internalGap <= 800 * 0.28 + 1e-9);
  closeTo(geometry.imageZoneHeight, 180);
  closeTo(geometry.height, geometry.imageZoneHeight + geometry.descriptionHeight + geometry.internalGap);
  assert(geometry.height < 800);
});

test("uses Pinterest layout whenever the primary spans every column", () => {
  const phone = computeAdvertisingPhotoGeometry({
    ...base,
    layoutViewportWidth: 750,
    viewportHeight: 900,
    columns: 3,
  });
  const tablet = computeAdvertisingPhotoGeometry({
    ...base,
    layoutViewportWidth: 751,
    viewportHeight: 900,
    columns: 3,
  });

  const split = computeAdvertisingPhotoGeometry({
    ...base,
    layoutViewportWidth: 1005,
    viewportHeight: 900,
    columns: 4,
  });

  for (const geometry of [phone, tablet]) {
    assert.equal(geometry.mode, "pinterest");
    assert.equal(geometry.span, geometry.columns);
    assert.equal(geometry.descriptionWidth, geometry.width);
    assert.ok(geometry.top + geometry.height <= 900);
    assert.ok(geometry.descriptionHeight + geometry.internalGap <= 900 * 0.28);
    closeTo(geometry.imageZoneHeight + geometry.descriptionHeight + geometry.internalGap, geometry.height);
  }
  assert.equal(split.mode, "split");
  assert.equal(split.span, 3);
});

test("keeps responsive gaps and safe insets while capping full-span primary at the viewport", () => {
  const cases = [
    { width: 700, height: 500, gap: 15, peek: 50 },
    { width: 1000, height: 900, gap: 25, peek: 50 },
    { width: 1300, height: 1500, gap: 35, peek: 50 },
  ];

  for (const sample of cases) {
    const geometry = computeAdvertisingPhotoGeometry({
      ...base,
      layoutViewportWidth: sample.width,
      viewportHeight: sample.height,
      columns: columnsForWidth(sample.width),
      headerHeight: 70,
      safeTop: 5,
      safeBottom: 7,
      imageWidth: 3000,
    });

    assert.equal(geometry.gap, sample.gap);
    assert.equal(geometry.belowPeek, sample.peek);
    closeTo(geometry.top, 70 + sample.gap + 5);
    closeTo(
      geometry.heightCap,
      sample.height - geometry.top - sample.gap - sample.peek - 7,
    );
    if (geometry.mode === "split") {
      closeTo(geometry.height, geometry.heightCap);
      assert.ok(geometry.top + geometry.height + geometry.gap + geometry.belowPeek + 7 <= sample.height);
    } else {
      assert.ok(geometry.top + geometry.height + 7 <= sample.height);
      assert.ok(geometry.imageZoneHeight <= geometry.width / (3000 / base.imageHeight) + 1e-9);
      closeTo(geometry.imageZoneHeight + geometry.descriptionHeight + geometry.internalGap, geometry.height);
    }
  }
});

test("uses one responsive token for detail outer edges and the navbar-to-primary gap", () => {
  for (const layoutViewportWidth of [320, 750, 751, 820, 960, 961, 1200, 1201, 1569, 1920, 2560]) {
    const geometry = computeAdvertisingPhotoGeometry({
      ...base,
      layoutViewportWidth,
      viewportHeight: 1200,
      columns: columnsForWidth(layoutViewportWidth),
      headerHeight: 100,
    });
    assert.equal(geometry.top - base.headerHeight, advertisingSpacing(layoutViewportWidth).outer,
      `${layoutViewportWidth}px detail outer gap matches the navbar-to-primary gap`);
  }
});

test("fills split primary to its cap and keeps a wide full-span image at natural height", () => {
  const split = computeAdvertisingPhotoGeometry(base);
  const pinterest = computeAdvertisingPhotoGeometry({ ...base, layoutViewportWidth: 390, columns: 1, imageWidth: 4000 });

  closeTo(split.height, split.heightCap);
  assert.equal(pinterest.mode, "pinterest");
  assert(pinterest.height < base.viewportHeight);
  closeTo(pinterest.imageWidth / pinterest.imageHeight, 4);
  closeTo(pinterest.imageWidth, pinterest.imageZoneWidth);
  closeTo(pinterest.imageHeight, pinterest.imageZoneHeight);
  assert.equal(pinterest.hasContainOverflow, false);
});

test("keeps split primary at its viewport cap when measured text changes", () => {
  const first = computeAdvertisingPhotoGeometry(base);
  const measured = computeAdvertisingPhotoGeometry({ ...base, descriptionHeight: 500 });

  assert.equal(measured.mode, "split");
  closeTo(measured.width, first.width);
  closeTo(measured.descriptionWidth, first.descriptionWidth);
  closeTo(measured.height, first.height);
  closeTo(measured.descriptionHeight, first.descriptionHeight);
  closeTo(measured.imageZoneHeight, first.imageZoneHeight);
});

test("uses natural full-span description until its viewport cap, then paginates", () => {
  const first = computeAdvertisingPhotoGeometry({ ...base, layoutViewportWidth: 390, columns: 1, viewportHeight: 1600, imageWidth: 2000 });
  const measured = computeAdvertisingPhotoGeometry({
    ...base,
    layoutViewportWidth: 390,
    columns: 1,
    viewportHeight: 1600,
    imageWidth: 2000,
    descriptionHeight: 400,
  });
  const overflow = computeAdvertisingPhotoGeometry({
    ...base,
    layoutViewportWidth: 390,
    columns: 1,
    viewportHeight: 800,
    imageWidth: 2000,
    descriptionHeight: 2000,
  });

  assert.equal(measured.mode, "pinterest");
  closeTo(measured.width, first.width);
  closeTo(measured.descriptionWidth, first.descriptionWidth);
  closeTo(measured.descriptionHeight, 400);
  assert.ok(measured.height < first.height && first.height < 1600);
  assert.ok(measured.descriptionHeight + measured.internalGap <= 1600 * 0.28);
  closeTo(measured.imageZoneHeight + measured.descriptionHeight + measured.internalGap, measured.height);
  closeTo(measured.imageZoneHeight, first.imageZoneHeight);
  assert(measured.descriptionHeight < first.descriptionHeight);
  assert(overflow.height < 800);
  assert.ok(overflow.descriptionHeight + overflow.internalGap <= 800 * 0.28);
  closeTo(overflow.imageZoneHeight + overflow.descriptionHeight + overflow.internalGap, overflow.height);
});

test("preserves output fields and contains every catalog photo across measured viewports", () => {
  const expectedFields = [
    "belowPeek", "cardWidth", "columns", "descriptionHeight", "descriptionWidth",
    "gap", "gridWidth", "hasContainOverflow", "height", "heightCap", "imageHeight", "imageWidth",
    "imageZoneHeight", "imageZoneWidth", "internalGap", "mode", "span", "top", "width",
  ];
  let cases = 0;

  for (const viewport of measuredViewports) {
    for (const card of ADVERTISING_CARDS) {
      const first = computeAdvertisingPhotoGeometry({
        ...viewport,
        imageWidth: card.media.width,
        imageHeight: card.media.height,
      });
      const measured = computeAdvertisingPhotoGeometry({
        ...viewport,
        imageWidth: card.media.width,
        imageHeight: card.media.height,
        descriptionHeight: 180,
      });
      const ratio = card.media.width / card.media.height;
      const expectedSpan = Math.min(3, first.columns);

      cases += 1;
      assert.deepEqual(Object.keys(first).sort(), expectedFields);
      assert.equal(first.span, expectedSpan);
      assert.equal(first.mode, first.span === first.columns ? "pinterest" : "split");
      assert.ok(first.imageWidth > 0);
      assert.ok(first.imageHeight > 0);
      assert.ok(first.descriptionWidth > 0);
      assert.ok(first.descriptionHeight > 0);
      closeTo(first.imageWidth / first.imageHeight, ratio, 1e-12);
      assert.ok(first.imageWidth <= first.imageZoneWidth + 1e-9);
      assert.ok(first.imageHeight <= first.imageZoneHeight + 1e-9);
      assert.equal(first.hasContainOverflow,
        first.imageWidth < first.imageZoneWidth - 0.5 || first.imageHeight < first.imageZoneHeight - 0.5);
      if (first.mode === "split") {
        closeTo(first.height, first.heightCap);
        assert.ok(first.top + first.height + first.gap + first.belowPeek <= viewport.viewportHeight + 1e-9);
      } else {
        assert.ok(first.top + first.height <= viewport.viewportHeight);
        assert.ok(first.imageZoneHeight <= first.width / ratio + 1e-9);
        assert.ok(first.descriptionHeight + first.internalGap <= viewport.viewportHeight * 0.28);
        closeTo(first.imageZoneHeight + first.descriptionHeight + first.internalGap, first.height);
      }
      closeTo(measured.width, first.width);
      closeTo(measured.descriptionWidth, first.descriptionWidth);
      assert.equal(measured.span, first.span);
      assert.equal(measured.mode, first.mode);
      if (first.mode === "split") closeTo(measured.height, first.height);
      else assert.ok(measured.top + measured.height <= viewport.viewportHeight);
    }
  }

  assert.equal(cases, measuredViewports.length * ADVERTISING_CARDS.length);
});

test("L04R keeps existing geometry when readable floors fit and grows only insufficient zones", () => {
  const options = { ...base, layoutViewportWidth: 390, columns: 1, viewportHeight: 844, imageWidth: 2000, descriptionHeight: 300 };
  const original = computeAdvertisingPhotoGeometry(options);
  assert.deepEqual(computeAdvertisingPhotoGeometry({ ...options, minimumDescriptionHeight: 0, minimumImageZoneHeight: 0 }), original);
  assert.deepEqual(computeAdvertisingPhotoGeometry({ ...options, minimumDescriptionHeight: 100, minimumImageZoneHeight: 80 }), original);
  const readable = computeAdvertisingPhotoGeometry({ ...options, minimumDescriptionHeight: 340, minimumImageZoneHeight: 104 });
  assert.equal(readable.descriptionHeight, 340);
  assert.ok(readable.descriptionHeight > original.descriptionHeight);
  assert.ok(readable.imageZoneHeight >= 104);
  closeTo(readable.imageWidth / readable.imageHeight, options.imageWidth / options.imageHeight);
  closeTo(readable.height, readable.imageZoneHeight + readable.descriptionHeight + readable.internalGap);
  const split = computeAdvertisingPhotoGeometry({ ...base, viewportHeight: 390, minimumDescriptionHeight: 420, minimumImageZoneHeight: 104 });
  assert.equal(split.mode, "split");
  assert.equal(split.descriptionHeight, 420);
  assert.equal(split.height, 420);
  assert.ok(split.top + split.height > 390, "insufficient viewport becomes scrollable");
  for (const field of ["minimumDescriptionHeight", "minimumImageZoneHeight"]) {
    for (const value of [-1, NaN, Infinity]) assert.throws(() => computeAdvertisingPhotoGeometry({ ...base, [field]: value }), TypeError);
  }
});

test("validates finite inputs and rejects physically impossible geometry", () => {
  assert.throws(() => computeAdvertisingPhotoGeometry(), TypeError);
  assert.throws(() => computeAdvertisingPhotoGeometry({ ...base, imageWidth: 0 }), TypeError);
  assert.throws(() => computeAdvertisingPhotoGeometry({ ...base, columns: null }), TypeError);
  assert.throws(() => computeAdvertisingPhotoGeometry({ ...base, safeTop: -1 }), TypeError);
  assert.throws(() => computeAdvertisingPhotoGeometry({ ...base, descriptionHeight: -1 }), TypeError);
  assert.throws(() => computeAdvertisingPhotoGeometry({ ...base, descriptionHeight: Number.NaN }), TypeError);
  assert.throws(() => computeAdvertisingPhotoGeometry({ ...base, descriptionHeight: Number.POSITIVE_INFINITY }), TypeError);
  assert.throws(() => computeAdvertisingPhotoGeometry({
    ...base,
    layoutViewportWidth: 390,
    viewportHeight: 180,
    headerHeight: 100,
  }), RangeError);
  const compactPinterest = computeAdvertisingPhotoGeometry({
    ...base,
    layoutViewportWidth: 390,
    columns: columnsForWidth(390),
    viewportHeight: 188,
    headerHeight: 100,
    imageWidth: 2000,
  });
  assert.equal(compactPinterest.mode, "pinterest");
  assert.ok(compactPinterest.height <= 188);
  assert.ok(compactPinterest.descriptionHeight + compactPinterest.internalGap <= 188 * 0.28);
});
