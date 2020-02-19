
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

    /* src/Social.svelte generated by Svelte v3.18.2 */

    const file = "src/Social.svelte";

    function create_fragment(ctx) {
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
    	let t9;
    	let a5;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			a0.textContent = "tw";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "ig";
    			t3 = space();
    			a2 = element("a");
    			a2.textContent = "gh";
    			t5 = space();
    			a3 = element("a");
    			a3.textContent = "li";
    			t7 = space();
    			a4 = element("a");
    			a4.textContent = "are.na";
    			t9 = space();
    			a5 = element("a");
    			a5.textContent = "cv";
    			attr_dev(a0, "href", "https://twitter.com/pseuyi");
    			add_location(a0, file, 1, 2, 8);
    			attr_dev(a1, "href", "https://www.instagram.com/aftre_f/");
    			add_location(a1, file, 2, 2, 54);
    			attr_dev(a2, "href", "https://github.com/pseuyi");
    			add_location(a2, file, 3, 2, 108);
    			attr_dev(a3, "href", "https://www.linkedin.com/in/pseuyi/");
    			add_location(a3, file, 4, 2, 153);
    			attr_dev(a4, "href", "https://www.are.na/freda-nada");
    			add_location(a4, file, 5, 2, 208);
    			attr_dev(a5, "href", "https://docs.google.com/document/d/18GQSqlOH4n46326_tAB26Go9NKEBiMQGqiRomDJTP6w/edit?usp=sharing");
    			add_location(a5, file, 6, 2, 261);
    			add_location(div, file, 0, 0, 0);
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
    			append_dev(div, t9);
    			append_dev(div, a5);
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
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Social extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Social",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.18.2 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let img;
    	let img_src_value;
    	let t0;
    	let h20;
    	let t2;
    	let p0;
    	let t4;
    	let p1;
    	let t6;
    	let div;
    	let t7;
    	let a0;
    	let t9;
    	let ol;
    	let li0;
    	let h21;
    	let t11;
    	let ul0;
    	let li1;
    	let a1;
    	let t13;
    	let li2;
    	let a2;
    	let t15;
    	let li3;
    	let a3;
    	let t17;
    	let li4;
    	let a4;
    	let t19;
    	let li5;
    	let a5;
    	let t21;
    	let li6;
    	let a6;
    	let t23;
    	let li7;
    	let h22;
    	let t25;
    	let ul1;
    	let li8;
    	let a7;
    	let t27;
    	let li9;
    	let a8;
    	let t29;
    	let li10;
    	let h23;
    	let t31;
    	let ul2;
    	let li11;
    	let a9;
    	let t33;
    	let li12;
    	let a10;
    	let current;
    	const social = new Social({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			img = element("img");
    			t0 = space();
    			h20 = element("h2");
    			h20.textContent = "freda suyi ding";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "is a computer programmer based in chinatown, nyc.";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "they are interested in frameworks for social progress, expressiveness of\n    code, and experimenting with ways of thinking.";
    			t6 = space();
    			div = element("div");
    			create_component(social.$$.fragment);
    			t7 = space();
    			a0 = element("a");
    			a0.textContent = "blog";
    			t9 = space();
    			ol = element("ol");
    			li0 = element("li");
    			h21 = element("h2");
    			h21.textContent = "web";
    			t11 = space();
    			ul0 = element("ul");
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "webmidi piano w modes";
    			t13 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "elm + 2048";
    			t15 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "sequencer";
    			t17 = space();
    			li4 = element("li");
    			a4 = element("a");
    			a4.textContent = "markdown + html converter";
    			t19 = space();
    			li5 = element("li");
    			a5 = element("a");
    			a5.textContent = "web terminal";
    			t21 = space();
    			li6 = element("li");
    			a6 = element("a");
    			a6.textContent = "connect places";
    			t23 = space();
    			li7 = element("li");
    			h22 = element("h2");
    			h22.textContent = "sketchbook";
    			t25 = space();
    			ul1 = element("ul");
    			li8 = element("li");
    			a7 = element("a");
    			a7.textContent = "rita + processing";
    			t27 = space();
    			li9 = element("li");
    			a8 = element("a");
    			a8.textContent = "tilde club";
    			t29 = space();
    			li10 = element("li");
    			h23 = element("h2");
    			h23.textContent = "archive";
    			t31 = space();
    			ul2 = element("ul");
    			li11 = element("li");
    			a9 = element("a");
    			a9.textContent = "2017";
    			t33 = space();
    			li12 = element("li");
    			a10 = element("a");
    			a10.textContent = "2016";
    			attr_dev(img, "alt", "photo of freda");
    			if (img.src !== (img_src_value = "/pic.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "height", "400px");
    			add_location(img, file$1, 10, 2, 143);
    			attr_dev(h20, "class", "svelte-hgohpc");
    			add_location(h20, file$1, 11, 2, 204);
    			add_location(p0, file$1, 13, 2, 232);
    			add_location(p1, file$1, 16, 2, 299);
    			attr_dev(a0, "href", "/blog");
    			add_location(a0, file$1, 22, 4, 465);
    			add_location(div, file$1, 20, 2, 440);
    			attr_dev(h21, "class", "svelte-hgohpc");
    			add_location(h21, file$1, 26, 8, 515);
    			add_location(li0, file$1, 26, 4, 511);
    			attr_dev(a1, "href", "/modes");
    			add_location(a1, file$1, 28, 10, 552);
    			attr_dev(li1, "class", "svelte-hgohpc");
    			add_location(li1, file$1, 28, 6, 548);
    			attr_dev(a2, "href", "/2048");
    			add_location(a2, file$1, 29, 10, 610);
    			attr_dev(li2, "class", "svelte-hgohpc");
    			add_location(li2, file$1, 29, 6, 606);
    			attr_dev(a3, "href", "/sequencer");
    			add_location(a3, file$1, 30, 10, 656);
    			attr_dev(li3, "class", "svelte-hgohpc");
    			add_location(li3, file$1, 30, 6, 652);
    			attr_dev(a4, "href", "https://iso-note.herokuapp.com/");
    			add_location(a4, file$1, 32, 8, 715);
    			attr_dev(li4, "class", "svelte-hgohpc");
    			add_location(li4, file$1, 31, 6, 702);
    			attr_dev(a5, "href", "/magiclamp");
    			add_location(a5, file$1, 34, 10, 809);
    			attr_dev(li5, "class", "svelte-hgohpc");
    			add_location(li5, file$1, 34, 6, 805);
    			attr_dev(a6, "href", "https://vespertine-rhythms.herokuapp.com/");
    			add_location(a6, file$1, 36, 8, 871);
    			attr_dev(li6, "class", "svelte-hgohpc");
    			add_location(li6, file$1, 35, 6, 858);
    			attr_dev(ul0, "class", "svelte-hgohpc");
    			add_location(ul0, file$1, 27, 4, 537);
    			attr_dev(h22, "class", "svelte-hgohpc");
    			add_location(h22, file$1, 40, 8, 973);
    			add_location(li7, file$1, 40, 4, 969);
    			attr_dev(a7, "href", "/grammar");
    			add_location(a7, file$1, 42, 10, 1017);
    			attr_dev(li8, "class", "svelte-hgohpc");
    			add_location(li8, file$1, 42, 6, 1013);
    			attr_dev(a8, "href", "http://tilde.learning-gardens.co/~freda/");
    			add_location(a8, file$1, 43, 10, 1073);
    			attr_dev(li9, "class", "svelte-hgohpc");
    			add_location(li9, file$1, 43, 6, 1069);
    			attr_dev(ul1, "class", "svelte-hgohpc");
    			add_location(ul1, file$1, 41, 4, 1002);
    			attr_dev(h23, "class", "svelte-hgohpc");
    			add_location(h23, file$1, 46, 8, 1163);
    			add_location(li10, file$1, 46, 4, 1159);
    			attr_dev(a9, "href", "/2017");
    			add_location(a9, file$1, 48, 10, 1204);
    			attr_dev(li11, "class", "svelte-hgohpc");
    			add_location(li11, file$1, 48, 6, 1200);
    			attr_dev(a10, "href", "/2016");
    			add_location(a10, file$1, 49, 10, 1244);
    			attr_dev(li12, "class", "svelte-hgohpc");
    			add_location(li12, file$1, 49, 6, 1240);
    			attr_dev(ul2, "class", "svelte-hgohpc");
    			add_location(ul2, file$1, 47, 4, 1189);
    			attr_dev(ol, "class", "svelte-hgohpc");
    			add_location(ol, file$1, 25, 2, 502);
    			attr_dev(main, "class", "svelte-hgohpc");
    			add_location(main, file$1, 9, 0, 134);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, img);
    			append_dev(main, t0);
    			append_dev(main, h20);
    			append_dev(main, t2);
    			append_dev(main, p0);
    			append_dev(main, t4);
    			append_dev(main, p1);
    			append_dev(main, t6);
    			append_dev(main, div);
    			mount_component(social, div, null);
    			append_dev(div, t7);
    			append_dev(div, a0);
    			append_dev(main, t9);
    			append_dev(main, ol);
    			append_dev(ol, li0);
    			append_dev(li0, h21);
    			append_dev(ol, t11);
    			append_dev(ol, ul0);
    			append_dev(ul0, li1);
    			append_dev(li1, a1);
    			append_dev(ul0, t13);
    			append_dev(ul0, li2);
    			append_dev(li2, a2);
    			append_dev(ul0, t15);
    			append_dev(ul0, li3);
    			append_dev(li3, a3);
    			append_dev(ul0, t17);
    			append_dev(ul0, li4);
    			append_dev(li4, a4);
    			append_dev(ul0, t19);
    			append_dev(ul0, li5);
    			append_dev(li5, a5);
    			append_dev(ul0, t21);
    			append_dev(ul0, li6);
    			append_dev(li6, a6);
    			append_dev(ol, t23);
    			append_dev(ol, li7);
    			append_dev(li7, h22);
    			append_dev(ol, t25);
    			append_dev(ol, ul1);
    			append_dev(ul1, li8);
    			append_dev(li8, a7);
    			append_dev(ul1, t27);
    			append_dev(ul1, li9);
    			append_dev(li9, a8);
    			append_dev(ol, t29);
    			append_dev(ol, li10);
    			append_dev(li10, h23);
    			append_dev(ol, t31);
    			append_dev(ol, ul2);
    			append_dev(ul2, li11);
    			append_dev(li11, a9);
    			append_dev(ul2, t33);
    			append_dev(ul2, li12);
    			append_dev(li12, a10);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(social.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(social.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(social);
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

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
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
