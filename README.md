# do-chat
Simple chat web-component to experiment for playing with newer browser APIs and language features and perhaps create 
something useful in the process.  

The included elements have no dependencies, can be used in a framework or "as-is" including them directly in your page without a 
build process or anything, browser support for modules is quite good ;)  
The chat should be highly extensible and customizable thanks to some of the recent APIs that are in use,

- Broadcast channel, helps decoupling the chat from any logic that can live in a web-worker listening to new messages being produced. 
- Form-associated custom elements, make the producing of messages much simpler and extensible, the chat will 
intercept any form submission and send the data the via the broadcast channel. Normal forms just work but if you want to
make things simpler, creating a nice form-associeted custom element will improve the experience.
- Adopted stylesheets allow to add extra styles to the shadow dom of the elements so integrating a custom theme should 
become a simple task.
- Static class properties, not that new since it was posible to use static getters/setters but now is prettier
and I use them expose the template and styles user to construct the elements so users can customize or extend from a sub-class.
- Private class properties make encapsulation easier perhaps now it makes sense to use the `{mode: 'closed'}` of the shadowDOM?
Another surprise was being able to use arrow functions as private fields and have `this` be what you expect so event handlers 
can be passed directly to `addEventlistener('some-event', this.#someHandler)` without `.bind` uglyness.

Check it out and give feedback! nowadays creating custom elements feels fun and simple enough that a library/framework seems un-necessary in
in many cases, for complex apps keep using your DOM mutation tool of choice that will have less work with a now simplified DOM 
thanks to the reduced complexity abstracted away by custom-elements. Let's make the web simple again! ;P
