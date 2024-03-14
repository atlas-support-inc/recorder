import { stringify } from '../src/plugins/console/record/stringify';
// import { sampleEvents } from './utils';
// import { EventType } from '../src/types';

describe('stringify', () => {
  class Node {
    nodeName = 'NODE';
  }
  class HTMLElement extends Node {
    outerHTML = '<div>foo</div>';
  }

  const prev: { Node?: any; HTMLElement?: any } = {};

  beforeAll(() => {
    prev.Node = global.Node;
    prev.HTMLElement = global.HTMLElement;
    Object.assign(global, { Node, HTMLElement });
  });

  afterAll(() => {
    Object.assign(global, prev);
  });

  it('stringifies basic types', () => {
    expect(stringify(undefined)).toEqual('"undefined"');
    expect(stringify(null)).toEqual('null');
    expect(stringify(true)).toEqual('true');
    expect(stringify(123.45)).toEqual('123.45');
    expect(stringify('foo')).toEqual('"foo"');
  });

  it('stringifies dates', () => {
    expect(stringify(new Date(1))).toEqual('"1970-01-01T00:00:00.001Z"');
  });

  it('stringifies DOM nodes', () => {
    const node = new Node();
    expect(stringify(node)).toEqual('"NODE"');

    const element = new HTMLElement();
    expect(stringify(element)).toEqual('"<div>foo</div>"');
  });

  it('stringifies events', () => {
    const event = new Event('click');
    const str = stringify(event);
    const result = JSON.parse(str);
    expect(result).toHaveProperty('type', 'click');
    expect(result).toHaveProperty('bubbles', false);
  });

  it('stringifies arrays', () => {
    expect(stringify([1, 2, 3])).toEqual('[1,2,3]');
    expect(stringify([1, ['foo'], true])).toEqual('[1,["foo"],true]');
  });

  it('stringifies objects', () => {
    expect(stringify({})).toEqual('{}');
    expect(stringify({ foo: 'bar' })).toEqual('{"foo":"bar"}');
    expect(stringify({ foo: { bar: 'baz' }, baz: { bar: 'foo' } })).toEqual(
      '{"foo":{"bar":"baz"},"baz":{"bar":"foo"}}',
    );
  });

  it.skip('handles circular references', () => {
    const o: any = { a: { b: { c: {} } } };
    o.a.b.c.o = o;
    expect(stringify(o, { depthOfLimit: 5, numOfKeysLimit: 50 })).toEqual(
      '{"a":{"b":{"c":{"o":"[Circular ~]"}}}}',
    );
  });

  it('limits the depth of objects', () => {
    const o: any = { a: { b: { c: {} } } };
    expect(stringify(o, { depthOfLimit: 2, numOfKeysLimit: 50 })).toEqual(
      '"[object Object]"',
    );
  });
});
