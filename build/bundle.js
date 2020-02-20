
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/Bio.svelte generated by Svelte v3.18.2 */

    const file = "src/Bio.svelte";

    function create_fragment(ctx) {
    	let section;
    	let header0;
    	let t1;
    	let p0;
    	let t2;
    	let a0;
    	let t4;
    	let t5;
    	let header1;
    	let t7;
    	let p1;
    	let t8;
    	let a1;
    	let t10;
    	let t11;
    	let header2;
    	let t13;
    	let p2;

    	const block = {
    		c: function create() {
    			section = element("section");
    			header0 = element("header");
    			header0.textContent = "is a computer programmer based in chinatown, nyc.";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("they are interested in frameworks for social progress, ");
    			a0 = element("a");
    			a0.textContent = "expression with code";
    			t4 = text(",\n    and experimenting with ways of thinking.");
    			t5 = space();
    			header1 = element("header");
    			header1.textContent = "currently";
    			t7 = space();
    			p1 = element("p");
    			t8 = text("they are thinking about type systems, ");
    			a1 = element("a");
    			a1.textContent = "abstract nonsense";
    			t10 = text(", functional paradigms, and minimal web\n    frameworks. they are most experienced with data driven web applications but\n    are curious about other things too!");
    			t11 = space();
    			header2 = element("header");
    			header2.textContent = "recently";
    			t13 = space();
    			p2 = element("p");
    			p2.textContent = "they were at the recurse center, a programming retreat in brooklyn, nyc.\n    before that they worked on tools for building communities at a startup.";
    			add_location(header0, file, 1, 2, 12);
    			attr_dev(a0, "href", "https://hydra-editor.glitch.me/?sketch_id=D5F8r9Tt2gfz9iTF&code=JTJGJTJGJTIwJTQwcHNldXlpJTBBJTBBb3NjKDclMkMlMjAwLjEpJTBBJTIwJTIwLmFkZChub2lzZSgwLjclMkMlMjAwLjEpKSUwQSUyMCUyMC5jb2xvcigyJTJDJTIwMiUyQyUyMDEwMCklMEElMjAlMjAuY29sb3JhbWEoMTAwKSUwQSUyMCUyMC5tb2R1bGF0ZSh2b3Jvbm9pKDEwJTJDJTIwMiUyQyUyMDUpJTBBJTIwJTIwJTIwJTIwLmthbGVpZCg0MDApJTBBJTIwJTIwJTIwJTIwLnNjYWxlKCglN0J0aW1lJTdEKSUzRCUzRU1hdGguc2luKHRpbWUpKjAuNSUyQjEpJTBBJTIwJTIwJTIwJTIwLm1vZHVsYXRlKG5vaXNlKDAuNiUyQzAuNSkpJTJDJTBBJTIwJTIwJTIwJTIwKCklMjAlM0QlM0UlMjBhLmZmdCU1QjIlNUQlMEElMjAlMjAlMjApJTBBJTIwJTIwLm91dCgp");
    			add_location(a0, file, 5, 57, 150);
    			add_location(p0, file, 4, 2, 89);
    			add_location(header1, file, 8, 2, 809);
    			attr_dev(a1, "href", "https://en.wikipedia.org/wiki/Abstract_nonsense");
    			add_location(a1, file, 10, 40, 882);
    			add_location(p1, file, 9, 2, 838);
    			add_location(header2, file, 15, 2, 1131);
    			add_location(p2, file, 16, 2, 1159);
    			add_location(section, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, header0);
    			append_dev(section, t1);
    			append_dev(section, p0);
    			append_dev(p0, t2);
    			append_dev(p0, a0);
    			append_dev(p0, t4);
    			append_dev(section, t5);
    			append_dev(section, header1);
    			append_dev(section, t7);
    			append_dev(section, p1);
    			append_dev(p1, t8);
    			append_dev(p1, a1);
    			append_dev(p1, t10);
    			append_dev(section, t11);
    			append_dev(section, header2);
    			append_dev(section, t13);
    			append_dev(section, p2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Bio extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bio",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/Social.svelte generated by Svelte v3.18.2 */

    const file$1 = "src/Social.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let a0;
    	let t1;
    	let a1;
    	let t3;
    	let a2;
    	let t5;
    	let a3;
    	let t7;
    	let a4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			a0.textContent = "gh";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "li";
    			t3 = space();
    			a2 = element("a");
    			a2.textContent = "are.na";
    			t5 = space();
    			a3 = element("a");
    			a3.textContent = "tw";
    			t7 = space();
    			a4 = element("a");
    			a4.textContent = "cv";
    			attr_dev(a0, "href", "https://github.com/pseuyi");
    			add_location(a0, file$1, 2, 2, 71);
    			attr_dev(a1, "href", "https://www.linkedin.com/in/pseuyi/");
    			add_location(a1, file$1, 3, 2, 116);
    			attr_dev(a2, "href", "https://www.are.na/freda-nada");
    			add_location(a2, file$1, 4, 2, 171);
    			attr_dev(a3, "href", "https://twitter.com/pseuyi");
    			add_location(a3, file$1, 5, 2, 224);
    			attr_dev(a4, "href", "https://docs.google.com/document/d/18GQSqlOH4n46326_tAB26Go9NKEBiMQGqiRomDJTP6w/edit?usp=sharing");
    			add_location(a4, file$1, 6, 2, 270);
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a0);
    			append_dev(div, t1);
    			append_dev(div, a1);
    			append_dev(div, t3);
    			append_dev(div, a2);
    			append_dev(div, t5);
    			append_dev(div, a3);
    			append_dev(div, t7);
    			append_dev(div, a4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Social extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Social",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/Projects.svelte generated by Svelte v3.18.2 */

    const file$2 = "src/Projects.svelte";

    function create_fragment$2(ctx) {
    	let ul4;
    	let li0;
    	let h20;
    	let t1;
    	let ul0;
    	let li1;
    	let a0;
    	let t3;
    	let li2;
    	let a1;
    	let t5;
    	let li3;
    	let a2;
    	let t7;
    	let li4;
    	let a3;
    	let t9;
    	let li5;
    	let a4;
    	let t11;
    	let li6;
    	let a5;
    	let t13;
    	let li7;
    	let h21;
    	let t15;
    	let ul1;
    	let li8;
    	let a6;
    	let t17;
    	let li9;
    	let a7;
    	let t19;
    	let li10;
    	let a8;
    	let t21;
    	let li11;
    	let h22;
    	let t23;
    	let ul2;
    	let li12;
    	let a9;
    	let t25;
    	let li13;
    	let a10;
    	let t27;
    	let li14;
    	let a11;
    	let t29;
    	let li15;
    	let h23;
    	let t31;
    	let ul3;
    	let li16;
    	let a12;
    	let t33;
    	let li17;
    	let a13;

    	const block = {
    		c: function create() {
    			ul4 = element("ul");
    			li0 = element("li");
    			h20 = element("h2");
    			h20.textContent = "apps";
    			t1 = space();
    			ul0 = element("ul");
    			li1 = element("li");
    			a0 = element("a");
    			a0.textContent = "webmidi piano";
    			t3 = space();
    			li2 = element("li");
    			a1 = element("a");
    			a1.textContent = "2048";
    			t5 = space();
    			li3 = element("li");
    			a2 = element("a");
    			a2.textContent = "sequencer";
    			t7 = space();
    			li4 = element("li");
    			a3 = element("a");
    			a3.textContent = "markdown + html notes";
    			t9 = space();
    			li5 = element("li");
    			a4 = element("a");
    			a4.textContent = "web terminal";
    			t11 = space();
    			li6 = element("li");
    			a5 = element("a");
    			a5.textContent = "connect places";
    			t13 = space();
    			li7 = element("li");
    			h21 = element("h2");
    			h21.textContent = "workshops";
    			t15 = space();
    			ul1 = element("ul");
    			li8 = element("li");
    			a6 = element("a");
    			a6.textContent = "writing react strategically @ react ladies";
    			t17 = space();
    			li9 = element("li");
    			a7 = element("a");
    			a7.textContent = "intro to git and github @ girl develop it hacktober";
    			t19 = space();
    			li10 = element("li");
    			a8 = element("a");
    			a8.textContent = "intro to javascript @ girl develop it";
    			t21 = space();
    			li11 = element("li");
    			h22 = element("h2");
    			h22.textContent = "sketches";
    			t23 = space();
    			ul2 = element("ul");
    			li12 = element("li");
    			a9 = element("a");
    			a9.textContent = "rita + processing";
    			t25 = space();
    			li13 = element("li");
    			a10 = element("a");
    			a10.textContent = "tilde club";
    			t27 = space();
    			li14 = element("li");
    			a11 = element("a");
    			a11.textContent = "mushrooms in vr";
    			t29 = space();
    			li15 = element("li");
    			h23 = element("h2");
    			h23.textContent = "archive";
    			t31 = space();
    			ul3 = element("ul");
    			li16 = element("li");
    			a12 = element("a");
    			a12.textContent = "2017";
    			t33 = space();
    			li17 = element("li");
    			a13 = element("a");
    			a13.textContent = "2016";
    			attr_dev(h20, "class", "svelte-11rbzt2");
    			add_location(h20, file$2, 1, 6, 11);
    			attr_dev(li0, "class", "svelte-11rbzt2");
    			add_location(li0, file$2, 1, 2, 7);
    			attr_dev(a0, "href", "/modes");
    			add_location(a0, file$2, 3, 8, 45);
    			attr_dev(li1, "class", "svelte-11rbzt2");
    			add_location(li1, file$2, 3, 4, 41);
    			attr_dev(a1, "href", "/2048");
    			add_location(a1, file$2, 4, 8, 93);
    			attr_dev(li2, "class", "svelte-11rbzt2");
    			add_location(li2, file$2, 4, 4, 89);
    			attr_dev(a2, "href", "/sequencer");
    			add_location(a2, file$2, 5, 8, 131);
    			attr_dev(li3, "class", "svelte-11rbzt2");
    			add_location(li3, file$2, 5, 4, 127);
    			attr_dev(a3, "href", "https://iso-note.herokuapp.com/");
    			add_location(a3, file$2, 7, 6, 186);
    			attr_dev(li4, "class", "svelte-11rbzt2");
    			add_location(li4, file$2, 6, 4, 175);
    			attr_dev(a4, "href", "/magiclamp");
    			add_location(a4, file$2, 9, 8, 272);
    			attr_dev(li5, "class", "svelte-11rbzt2");
    			add_location(li5, file$2, 9, 4, 268);
    			attr_dev(a5, "href", "https://vespertine-rhythms.herokuapp.com/");
    			add_location(a5, file$2, 11, 6, 330);
    			attr_dev(li6, "class", "svelte-11rbzt2");
    			add_location(li6, file$2, 10, 4, 319);
    			attr_dev(ul0, "class", "svelte-11rbzt2");
    			add_location(ul0, file$2, 2, 2, 32);
    			attr_dev(h21, "class", "svelte-11rbzt2");
    			add_location(h21, file$2, 26, 6, 842);
    			attr_dev(li7, "class", "svelte-11rbzt2");
    			add_location(li7, file$2, 26, 2, 838);
    			attr_dev(a6, "href", "https://github.com/pseuyi/react-ladies-lightning");
    			add_location(a6, file$2, 29, 6, 888);
    			attr_dev(li8, "class", "svelte-11rbzt2");
    			add_location(li8, file$2, 28, 4, 877);
    			attr_dev(a7, "href", "https://github.com/pseuyi/gdi-core-git-github");
    			add_location(a7, file$2, 34, 6, 1035);
    			attr_dev(li9, "class", "svelte-11rbzt2");
    			add_location(li9, file$2, 33, 4, 1024);
    			attr_dev(a8, "href", "https://gist.github.com/pseuyi/407944acd0b4f09a8f9686d32f844117");
    			add_location(a8, file$2, 39, 6, 1188);
    			attr_dev(li10, "class", "svelte-11rbzt2");
    			add_location(li10, file$2, 38, 4, 1177);
    			attr_dev(ul1, "class", "svelte-11rbzt2");
    			add_location(ul1, file$2, 27, 2, 868);
    			attr_dev(h22, "class", "svelte-11rbzt2");
    			add_location(h22, file$2, 44, 6, 1344);
    			attr_dev(li11, "class", "svelte-11rbzt2");
    			add_location(li11, file$2, 44, 2, 1340);
    			attr_dev(a9, "href", "/grammar");
    			add_location(a9, file$2, 46, 8, 1382);
    			attr_dev(li12, "class", "svelte-11rbzt2");
    			add_location(li12, file$2, 46, 4, 1378);
    			attr_dev(a10, "href", "http://tilde.learning-gardens.co/~freda/");
    			add_location(a10, file$2, 47, 8, 1436);
    			attr_dev(li13, "class", "svelte-11rbzt2");
    			add_location(li13, file$2, 47, 4, 1432);
    			attr_dev(a11, "href", "/e-doser");
    			add_location(a11, file$2, 49, 8, 1516);
    			attr_dev(li14, "class", "svelte-11rbzt2");
    			add_location(li14, file$2, 49, 4, 1512);
    			attr_dev(ul2, "class", "svelte-11rbzt2");
    			add_location(ul2, file$2, 45, 2, 1369);
    			attr_dev(h23, "class", "svelte-11rbzt2");
    			add_location(h23, file$2, 52, 6, 1575);
    			attr_dev(li15, "class", "svelte-11rbzt2");
    			add_location(li15, file$2, 52, 2, 1571);
    			attr_dev(a12, "href", "/2017");
    			add_location(a12, file$2, 54, 8, 1612);
    			attr_dev(li16, "class", "svelte-11rbzt2");
    			add_location(li16, file$2, 54, 4, 1608);
    			attr_dev(a13, "href", "/2016");
    			add_location(a13, file$2, 55, 8, 1650);
    			attr_dev(li17, "class", "svelte-11rbzt2");
    			add_location(li17, file$2, 55, 4, 1646);
    			attr_dev(ul3, "class", "svelte-11rbzt2");
    			add_location(ul3, file$2, 53, 2, 1599);
    			attr_dev(ul4, "class", "svelte-11rbzt2");
    			add_location(ul4, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul4, anchor);
    			append_dev(ul4, li0);
    			append_dev(li0, h20);
    			append_dev(ul4, t1);
    			append_dev(ul4, ul0);
    			append_dev(ul0, li1);
    			append_dev(li1, a0);
    			append_dev(ul0, t3);
    			append_dev(ul0, li2);
    			append_dev(li2, a1);
    			append_dev(ul0, t5);
    			append_dev(ul0, li3);
    			append_dev(li3, a2);
    			append_dev(ul0, t7);
    			append_dev(ul0, li4);
    			append_dev(li4, a3);
    			append_dev(ul0, t9);
    			append_dev(ul0, li5);
    			append_dev(li5, a4);
    			append_dev(ul0, t11);
    			append_dev(ul0, li6);
    			append_dev(li6, a5);
    			append_dev(ul4, t13);
    			append_dev(ul4, li7);
    			append_dev(li7, h21);
    			append_dev(ul4, t15);
    			append_dev(ul4, ul1);
    			append_dev(ul1, li8);
    			append_dev(li8, a6);
    			append_dev(ul1, t17);
    			append_dev(ul1, li9);
    			append_dev(li9, a7);
    			append_dev(ul1, t19);
    			append_dev(ul1, li10);
    			append_dev(li10, a8);
    			append_dev(ul4, t21);
    			append_dev(ul4, li11);
    			append_dev(li11, h22);
    			append_dev(ul4, t23);
    			append_dev(ul4, ul2);
    			append_dev(ul2, li12);
    			append_dev(li12, a9);
    			append_dev(ul2, t25);
    			append_dev(ul2, li13);
    			append_dev(li13, a10);
    			append_dev(ul2, t27);
    			append_dev(ul2, li14);
    			append_dev(li14, a11);
    			append_dev(ul4, t29);
    			append_dev(ul4, li15);
    			append_dev(li15, h23);
    			append_dev(ul4, t31);
    			append_dev(ul4, ul3);
    			append_dev(ul3, li16);
    			append_dev(li16, a12);
    			append_dev(ul3, t33);
    			append_dev(ul3, li17);
    			append_dev(li17, a13);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Projects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projects",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.18.2 */
    const file$3 = "src/App.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;
    	let h2;
    	let t3;
    	let t4;
    	let current;
    	const social = new Social({ $$inline: true });
    	const bio = new Bio({ $$inline: true });
    	const projects = new Projects({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			img = element("img");
    			t0 = space();
    			create_component(social.$$.fragment);
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "freda suyi ding";
    			t3 = space();
    			create_component(bio.$$.fragment);
    			t4 = space();
    			create_component(projects.$$.fragment);
    			attr_dev(img, "alt", "photo of freda");
    			if (img.src !== (img_src_value = "/pic.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "height", "600px");
    			add_location(img, file$3, 12, 2, 221);
    			attr_dev(h2, "class", "svelte-1qrcxhe");
    			add_location(h2, file$3, 14, 2, 295);
    			attr_dev(main, "class", "svelte-1qrcxhe");
    			add_location(main, file$3, 11, 0, 212);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, img);
    			append_dev(main, t0);
    			mount_component(social, main, null);
    			append_dev(main, t1);
    			append_dev(main, h2);
    			append_dev(main, t3);
    			mount_component(bio, main, null);
    			append_dev(main, t4);
    			mount_component(projects, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(social.$$.fragment, local);
    			transition_in(bio.$$.fragment, local);
    			transition_in(projects.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(social.$$.fragment, local);
    			transition_out(bio.$$.fragment, local);
    			transition_out(projects.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(social);
    			destroy_component(bio);
    			destroy_component(projects);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
