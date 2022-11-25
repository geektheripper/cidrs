# cidrs

An module that helps in network layout work

## Install

```shell
yarn add cidrs
npm install cidrs
```

## Example

```js
import { CIDR } from "./index.js"

// create an root CIDR
const ClassAPrivate = CIDR.fromString('10.0.0.0/8')

// take a CIDR from root
const DC1 = CIDR.fromString("10.0.0.0/12")
ClassAPrivate.take(DC1)
// => 10.0.0.0/12

// take another intersected CIDR will cause error
// const DC2 = CIDR.fromString("10.9.0.0/22")
// // => 10.9.0.0/22	 10.9.0.0-10.9.3.255(1048576)
// ClassAPrivate.register(DC2)
// // => Error("intersected intervals")

// allocate subnets
DC1.allocateSubnets(2)
// 10.0.0.0/14
// 10.4.0.0/14
// 10.8.0.0/14
// 10.12.0.0/14

// reallocate will cause error
// DC1.allocateSubnets(2)
// // subnet already allocated: 10.0.0.0/14

// `mkSubnets` just create subnets
// it won't take these from current CIDR
// and won't check if these has been taken either
DC1.mkSubnets(2)
// 10.0.0.0/14
// 10.4.0.0/14
// 10.8.0.0/14
// 10.12.0.0/14

// `take` will return the value passed in
// and the code can thus be made clearer like this
const DC3 = ClassAPrivate.take(CIDR.fromString("10.32.0.0/12"))
// 10.16.0.0/12	 10.16.0.0-10.31.255.255(1048576)

DC3.mkSubnets(2)
// 10.32.0.0/14
// 10.36.0.0/14
// 10.40.0.0/14
// 10.44.0.0/14

// select the subnet you need from the subnet list 
DC3.allocateSubnets(2, 1, 3)
// 10.36.0.0/14
// 10.40.0.0/14

// find out non allocated address
DC3.printNonAllocatedAddress()
// 10.32.0.0 - 10.36.0.0 (262144) (10.32.0.0/14)
// 10.44.0.0 - 10.48.0.0 (262144) (10.44.0.0/14)
// total (524288)

ClassAPrivate.printNonAllocatedAddress()
// 10.16.0.0 - 10.32.0.0 (1048576) (10.16.0.0/12)
// 10.48.0.0 - 11.0.0.0 (13631488)
// total (14680064)
```

## TODO:

- [ ] secret engine for Vault
- [ ] Terrform provider
