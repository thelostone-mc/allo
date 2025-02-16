# Writing Live Objects

Before diving head-first into writing Live Objects, we highly recommend checking out our [Introducing Spec](https://spec.dev/blog/introducing-spec) blog post as a primer on [Live Tables](https://spec.dev/blog/introducing-spec#live-tables), [Live Objects](https://spec.dev/blog/introducing-spec#live-objects), and the Spec ecosystem as a whole.

### Table of Contents

* [Requirements](#requirements)
* [X vs. Y](#x-vs-y)
* [Design Pattern](#design-pattern)
* [Namespaces](#namespaces)
* [Creating New Live Objects](#creating-live-objects)
* [File Structure](#file-structure)
* [Class Structure](#class-structure)
    * [Properties](#properties)
    * [Event Handlers](#event-handlers)
* [Saving](#saving)

# Requirements

* [Spec CLI](./CLI-Setup.md)
* [Deno](https://deno.com/manual@v1.33.1/getting_started/installation) >= 1.3 (we also highly recommend the Deno/Denoland VSCode extension)
* [Postgres](https://www.moncefbelyamani.com/how-to-install-postgresql-on-a-mac-with-homebrew-and-lunchy/) >= 14

# X vs. Y

Important differences to understand between key concepts.

* [Live Tables vs. Live Objects](./X-vs-Y.md#live-tables-vs-live-objects)
* [Live Objects vs. Subgraphs](./X-vs-Y.md#live-objects-vs-subgraphs)

# Design Pattern

Because all Live Objects are shared with the entire Spec ecosystem, different applications will end up 
utilizing many of the same Live Objects, but each in their own unique way. At the same time, applications often only need a hand-picked selection of data models (many times across a variety of protocols) rather than needing _all_ data models across _all_ protocols that they interact with. For these reasons, Live Objects should be designed to be as independent as possible. 

When looking at a Live Object class, any developer should easily be able to answer the following 2 questions:

1) What is the structure of this data model?
2) What causes data to change over time?

They shouldn't need to jump around to a handful of different files to answer these questions — everything should be self-contained within the class. This allows developers to more quickly evaluate...

<ol type="a">
 <li>What exactly a Live Object represents</li>
 <li>What data is included</li>
 <li>How exactly it's indexed</li>
</ol>

...without fear of potentially missing some type of additional logic that affects the data model elsewhere in the codebase.

# Namespaces

The Spec data ecosystem is organized contextually, by namespace. New users on Spec are assigned the namespace for their username, giving solo developers a location to index their own peronsal data into. Custom namespaces for protocols can also be created, and subsequently joined, by users who work for that protocol. All users on Spec have read-access to all namespaces, but only members who _belong_ to a namespace have write access. This is very similar to how GitHub organizations work. Examples of namespaces:

```
allo
gitcoin
compoundv3
...
```

Namespaces are used to contextually organize specific resources within the data ecosystem, including contract groups, events, and Live Objects. Ideally, all Live Objects for a particular namespace exist within a single GitHub repo for browsability.

# Creating New Live Objects

The Spec CLI makes it easy to create new Live Objects.

Simply move into the local directory for your namespace, run the following command, and follow the prompts.

```bash
$ spec new object
````

* Namespace — The namespace the Live Object belongs to
* Name — The actual name of the Live Object class
* Chain ids — The chain ids that the Live Object needs to index
* Display name — The display name used for the Live Object in the ecosystem
* Description — The description used for the Live Object in the ecosystem

**Example: Allo Project**

https://github.com/spec-dev/allo/assets/6496306/4620aa59-e109-4f71-87b3-0e19754f805b

This command will generate a new folder with the basic template for a Live Object.

# File Structure

Every Live Object folder has 2 main files:

```
MyLiveObject/
|-- manifest.json
|-- spec.ts
```

1. `manifest.json` — Basic metadata about the Live Object, mostly including information given during the `spec new object` command prompt
2. `spec.ts` — The Live Object class file

[Example Live Object folder](../Project/)

# Class Structure

If you haven't read the [Live Object Indexing](https://www.spec.dev/blog#indexing) section of our introductory blog post, we highly recommend looking through it.

Either way, let's jump into the basic structure of a Live Object class.

Within a Live Object class, logic is organized into 2 main sections, with each section written to answer a specific question:

**Section 1** — [Properties](#properties) — What is the structure of this data model?<br>
**Section 2** — [Event Handlers](#event-handlers) — What causes data to change over time?<br>

*If these questions look familiar, they are exactly the same questions as those in the [design pattern](#design-pattern) section above*.

To get a better feel for how these classes are written, let's take a look at a Live Object that indexes all Projects on Allo.

**`allo/Project/spec.ts`**
```typescript
import { LiveObject, Spec, Property, Event, OnEvent, BigInt, Json, Timestamp } from '@spec.dev/core'

/**
 * A Project on the Allo protocol.
 */
@Spec({ 
    uniqueBy: ['projectId', 'chainId']
})
class Project extends LiveObject {

    @Property()
    projectId: BigInt

    @Property()
    metaPtr: Json
    
    @Property()
    createdAt: Timestamp

    // ==== Event Handlers ===================

    @OnEvent('allo.ProjectRegistry.ProjectCreated')
    createProject(event: Event) {
        this.projectId = BigInt.from(event.data.projectID)
        this.createdAt = this.blockTimestamp
    }

    @OnEvent('allo.ProjectRegistry.MetadataUpdated')
    updateMetadata(event: Event) {
        this.projectId = BigInt.from(event.data.projectID)
        this.metaPtr = event.data.metaPtr || []
    }
}

export default Project
```

Keeping this example in mind, let's jump deeper into the 2 main class sections: [Properties](#properties) and [Event Handlers](#event-handlers).

## Properties

Within a Live Object, properties define what the actual structure of the data model is. To define a Live Object property, you can simply decorate a TypeScript class property with the `@Property()` decorator.

### Options

When using the `@Property()` decorator, there are a few notable options that can be given to further configure the property:

`default` — Set a default value for the property. This is set once the object is saved. Example:
```typescript
@Property({ default: true })
isActive: boolean
```

`columnType` — The exact column type to use in the Live Object's underlying Postgres table. Example:
```typescript
@Property({ columnType: 'text' })
someSuperLongValue: string
```

`canUpdate` — Whether this property can ever be updated after its initial value is set. Example:
```typescript
@Property({ canUpdate: false })
createdAt: Timestamp
```

### Base Properties

All Live Objects come with 4 additional properties that are included on the `LiveObject` base class:

1. `chainId` — The blockchain id
2. `blockNumber` — The block number in which the object was *last updated*
3. `blockTimestamp` — The block timestamp in which the object was *last updated*
4. `blockHash` — The block hash in which the object was *last updated*

Because these 4 properties are already included, there is no need to redefine them on your custom Live Objects. The `blockTimestamp` and `blockNumber` properties also remove the need for a custom `lastUpdated` property.

All of these properties are _automatically set for you_ any time your Live Object handles an event. These values are taken directly from the event itself and are set _before_ your event handler runs, making it easy to access these values with `this.chainId`, `this.blockNumber`, `this.blockTimestamp`, and `this.blockHash`.

### Property Types

The type you choose for a Live Object property is important, because it tells Spec what Postgres column type to use for underlying data storage.
Not only that, some of Spec's custom property types provide contextual information to other developers about what type of value a given property holds.

#### Custom types (need to be imported)

| Property Type     | Postgres Column Type |
| ------------------| ---------------------|
| `ChainId`         | `varchar`            |
| `Address`         | `varchar`            |
| `BlockNumber`     | `varchar`            |
| `BlockHash`       | `varchar`            |
| `TransactionHash` | `varchar`            |
| `Timestamp`       | `timestamptz`        |
| `Json`            | `json`               |
| `BigInt`          | `varchar`            |

#### Other types (built-in JavaScript types)
| Property Type     | Postgres Column Type |
| ------------------| ---------------------|
| `string`          | `varchar`            |
| `number`          | `integer`            |
| `boolean`         | `boolean`            |

## Event Handlers

Event handlers control exactly how a Live Object's data is indexed. These handlers are defined as methods on the Live Object class itself, and are created using the `@OnEvent()` decorator.

To understand which events can be handled, it's important to understand how contract groups work on Spec. Therefore, if you haven't read through our [guide on contract groups](./Contract-Groups.md), it is highly recommended.

### Formats & Specificity

There are 3 different formats that can be used when decorating an event handler, each resulting in a different level of event specificity:

#### 1) Chain-agnostic format
```typescript
@OnEvent('allo.ProjectRegistry.ProjectCreated')
createProject(event: Event) {}
```

This format of `namespace.ContractGroup.Event` makes it easy to handle a single event _across multiple chains_ with a single handler function. When using this format, the given event is handled across all chains listed in the Live Object's `manifest.json` file (inside the `chains` array — [example](../Project/manifest.json#L7)).

#### 2) Chain-specific format
```typescript
@OnEvent('eth.contracts.allo.ProjectRegistry.ProjectCreated')
createProject(event: Event) {}
```

If an event ever needs to be handled differently based on the specific chain it originated from, a chain-specific event name can be used. This is as simple as adding a chain-specific prefix to the event name. Here is the current list of supported chain-specific prefixes:

```
eth.contracts.
goerli.contracts.
polygon.contracts.
mumbai.contracts.
```

#### 3) Signature format
```typescript
@OnEvent('eth.contracts.allo.ProjectRegistry.ProjectCreated', {
    signature: '0x63c92f9505d420bff631cb9df33be952bdc11e2118da36a850b43e6bcc4ce4de'
})
createProject(event: Event) {}
```

If a contract group ever contains multiple events with the same name, the event signature — or `topic0` — is also required to be specified.

### Event Structure

Contract event interface:
```typescript
interface Event {
    id: string                    // event id unique to spec
    name: string                  // full event name with version (signature)
    origin: EventOrigin           // blockchain event origin data
    data: { [key: string]: any }  // contract event params
}

interface EventOrigin {
    chainId: string
    blockNumber: number
    blockHash: string
    blockTimestamp: string
    contractAddress: string
    transactionHash: string
    transactionIndex: number
    logIndex: string
    signature: string
}
```

Example:
```javascript
{
    id: '3dee9f84b83657da2a0b36a9fc69c7f526dba2e0f3a4bb4264f7c9c88a065ae8',
    name: 'eth.contracts.allo.ProjectRegistry.ProjectCreated@0x63c92f9505d420bff631cb9df33be952bdc11e2118da36a850b43e6bcc4ce4de',
    origin: {
        chainId: '',
        blockNumber: 17597721,
        blockHash: '0xec460c5b3f69cb3ca67f1374a160b541fb4362f725e6eece0805cac098c5869d',
        blockTimestamp: '2023-07-01T07:27:23.000Z',
        contractAddress: '0x03506ed3f57892c85db20c36846e9c808afe9ef4',
        transactionHash: '0x835057ad0db7a1d4c8b55a870b645a2e93de478c1173b37453e58035ef3e69bc',
        transactionIndex: 73,
        logIndex: '121',
        signature: '0x63c92f9505d420bff631cb9df33be952bdc11e2118da36a850b43e6bcc4ce4de'
    },
    data: {
        projectID: 1007,
        owner: '0xab6eaa7f32a98682e2502b3500ad8d58a90e091b'
    }
}
```

### Order of operations

When a contract event is indexed, Spec first creates a new instance of your Live Object class. It then calls an abstract class method that carries out the following steps:

![](https://dbjzhg7yxqn0y.cloudfront.net/ehf3.png)

# Saving

Within a Live Object class, all save operations translate to Postgres **upserts**. For those not familiar, "upsert" is another word for "insert-or-update", which functionality-wise translates to "Create this record if it doesn't exist yet....otherwise, just update it". Upserting is incredibly efficient, as it removes the need to query a table solely to see if a record exists before choosing between insert or update. 

In the context of Live Objects, upserts are only possible when the following 2 requirements are met:

The developer must...
1. Define the set of properties that makes any particular instance of that Live Object *unique*.
2. Assign values to each of ^these unique properties before saving (or auto-saving).

The entire purpose of `uniqueBy` within the `@Spec()` class decorator is to satisfy requirement #1 above. 
Looking back at the Allo Project example...

```typescript
@Spec({
    uniqueBy: ['projectId', 'chainId']
})
class Project extends LiveObject {
```

Because the Live Object is multi-chain, it makes since that a Project is unique by *the combination of* (`projectId`, `chainId`). And since Spec automatically assigns the value for `this.chainId`, the only unique property left to be set is `projectId`, which is done first-thing at the top of each event handler:

```typescript
@OnEvent('allo.ProjectRegistry.ProjectCreated')
createProject(event: Event) {
    this.projectId = BigInt.from(event.data.projectID)
    this.createdAt = this.blockTimestamp
}

@OnEvent('allo.ProjectRegistry.MetadataUpdated')
updateMetadata(event: Event) {
    this.projectId = BigInt.from(event.data.projectID)
    this.metaPtr = event.data.metaPtr || []
}
```

With both upsert requirements met, a `Project` instance will now be auto-saved after each of the above event handlers.

# Docs coming...

- imports / referencing other live object classes
- lookups, manual saves, transactions
- contract calls
- metadata resolution