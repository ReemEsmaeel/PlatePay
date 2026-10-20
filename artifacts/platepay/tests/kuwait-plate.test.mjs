import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretKuwaitPlate, plateCrop, regionRectangle, stripPlateWhitespace } from '../src/lib/kuwait-plate.ts';

const reading = (text, confidence = 95) => ({ text, confidence });

test('preserves both series and registration, including leading zeroes', () => {
  assert.equal(interpretKuwaitPlate(reading('12\n'), reading('34567\n')).plate, '1234567');
  assert.equal(interpretKuwaitPlate(reading('01'), reading('00234')).plate, '0100234');
});

test('normalizes equivalent numerals without guessing letters', () => {
  assert.equal(interpretKuwaitPlate(reading('١٢'), reading('۳۴۵۶۷')).plate, '1234567');
  for (const text of ['KUWAIT 12', 'I2', '1O', '1 2', '', '123']) {
    assert.equal(interpretKuwaitPlate(reading(text), reading('34567')).plate, null);
  }
});

test('removes typed and pasted whitespace without losing digits or leading zeroes', () => {
  assert.equal(stripPlateWhitespace(' 01  00234 '), '0100234');
  assert.equal(stripPlateWhitespace('01\t00\n234'), '0100234');
  assert.equal(stripPlateWhitespace('01\u00a000\u202f234'), '0100234');
  assert.equal(stripPlateWhitespace(''), '');
});

test('rejects partial, ambiguous, multiline and low-confidence reads', () => {
  for (const [series, number] of [
    [reading('12', 79), reading('34567')],
    [reading('12'), reading('34567', 79)],
    [reading('12'), reading('')],
    [reading('12'), reading('3456789')],
    [reading('12'), reading('345\n67')],
    [reading('12'), reading('34567', NaN)],
  ]) assert.equal(interpretKuwaitPlate(series, number).plate, null);
});

test('crop stays inside landscape and portrait photos at every supported zoom', () => {
  for (const [width, height] of [[430, 236], [4032, 3024], [3024, 4032]]) {
    for (const zoom of [1, 1.5, 2.4]) {
      const crop = plateCrop(width, height, zoom);
      assert.ok(crop.x >= 0 && crop.y >= 0);
      assert.ok(crop.x + crop.width <= width);
      assert.ok(crop.y + crop.height <= height);
      const ratio = width / height;
      const aspect = ratio >= 1.5 && ratio <= 2.3 ? ratio : 1.85;
      assert.ok(Math.abs(crop.width / crop.height - aspect) < 0.0001);
    }
  }
  assert.throws(() => plateCrop(0, 20, 1));
});

test('numeric regions exclude the vertical country label and upper-right text', () => {
  const series = regionRectangle('series', 1280, 692);
  const number = regionRectangle('number', 1280, 692);
  assert.ok(series.left > 0.1 * 1280);
  assert.ok(series.left + series.width < 0.45 * 1280);
  assert.ok(series.top + series.height < number.top);
  assert.ok(number.top + number.height <= 692);
});

test('an already framed plate is not clipped or stretched at default zoom', () => {
  const crop = plateCrop(430, 236, 1);
  assert.deepEqual(crop, { x: 0, y: 0, width: 430, height: 236 });
});

test('crop position can follow a plate anywhere in a full-car photo', () => {
  for (const [width, height] of [[1200, 800], [3024, 4032]]) {
    for (const zoom of [1.2, 2.5, 4]) {
      const crop = plateCrop(width, height, zoom, 1, 1);
      assert.ok(crop.x >= 0 && crop.y >= 0);
      assert.ok(crop.x + crop.width <= width + 0.001);
      assert.ok(crop.y + crop.height <= height + 0.001);
      assert.deepEqual(plateCrop(width, height, zoom, 5, -4), {
        ...plateCrop(width, height, zoom, 1, 0), y: 0,
      });
      assert.deepEqual(plateCrop(width, height, zoom, 0.5, 0.5), {
        x: (width - plateCrop(width, height, zoom).width) / 2,
        y: (height - plateCrop(width, height, zoom).height) / 2,
        width: plateCrop(width, height, zoom).width,
        height: plateCrop(width, height, zoom).height,
      });
    }
  }
  assert.throws(() => plateCrop(1200, 800, 2, Number.NaN, 0.5));
});
