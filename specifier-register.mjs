import {register} from 'node:module'
import {argv} from 'node:process'

register('./specifier-node.mjs', import.meta.url, {data: {argv1: argv[1]}})
