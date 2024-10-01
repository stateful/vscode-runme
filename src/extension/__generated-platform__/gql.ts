/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
    "mutation ArchiveCellOutput($id: String!) {\n  archiveCellOutput(id: $id) {\n    id\n  }\n}": types.ArchiveCellOutputDocument,
    "mutation CreateCellExecution($input: CreateCellExecutionInput!) {\n  createCellExecution(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}": types.CreateCellExecutionDocument,
    "mutation CreateExtensionCellOutput($input: ReporterInput!) {\n  createExtensionCellOutput(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}": types.CreateExtensionCellOutputDocument,
    "mutation CreateEscalation($input: CreateEscalationInput!) {\n  createEscalation(input: $input) {\n    id\n    escalationUrl\n  }\n}": types.CreateEscalationDocument,
    "query getUserEnvironments {\n  userEnvironments {\n    id\n    name\n    description\n  }\n}": types.GetUserEnvironmentsDocument,
    "mutation UnArchiveCellOutput($id: String!) {\n  unArchiveCellOutput(id: $id) {\n    id\n  }\n}": types.UnArchiveCellOutputDocument,
    "mutation UpdateCellOutput($id: String!, $input: UpdateCellOutputInput!) {\n  updateCellOutput(id: $id, input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}": types.UpdateCellOutputDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation ArchiveCellOutput($id: String!) {\n  archiveCellOutput(id: $id) {\n    id\n  }\n}"): (typeof documents)["mutation ArchiveCellOutput($id: String!) {\n  archiveCellOutput(id: $id) {\n    id\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateCellExecution($input: CreateCellExecutionInput!) {\n  createCellExecution(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"): (typeof documents)["mutation CreateCellExecution($input: CreateCellExecutionInput!) {\n  createCellExecution(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateExtensionCellOutput($input: ReporterInput!) {\n  createExtensionCellOutput(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"): (typeof documents)["mutation CreateExtensionCellOutput($input: ReporterInput!) {\n  createExtensionCellOutput(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateEscalation($input: CreateEscalationInput!) {\n  createEscalation(input: $input) {\n    id\n    escalationUrl\n  }\n}"): (typeof documents)["mutation CreateEscalation($input: CreateEscalationInput!) {\n  createEscalation(input: $input) {\n    id\n    escalationUrl\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query getUserEnvironments {\n  userEnvironments {\n    id\n    name\n    description\n  }\n}"): (typeof documents)["query getUserEnvironments {\n  userEnvironments {\n    id\n    name\n    description\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UnArchiveCellOutput($id: String!) {\n  unArchiveCellOutput(id: $id) {\n    id\n  }\n}"): (typeof documents)["mutation UnArchiveCellOutput($id: String!) {\n  unArchiveCellOutput(id: $id) {\n    id\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UpdateCellOutput($id: String!, $input: UpdateCellOutputInput!) {\n  updateCellOutput(id: $id, input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"): (typeof documents)["mutation UpdateCellOutput($id: String!, $input: UpdateCellOutputInput!) {\n  updateCellOutput(id: $id, input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;