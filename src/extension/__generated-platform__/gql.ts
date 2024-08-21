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
    "mutation ArchiveCellExecution($archiveCellExecutionId: String!) {\n  archiveCellExecution(id: $archiveCellExecutionId) {\n    id\n  }\n}": types.ArchiveCellExecutionDocument,
    "mutation CreateCellExecution($input: CreateCellExecutionInput!) {\n  createCellExecution(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}": types.CreateCellExecutionDocument,
    "mutation CreateCellOutput($input: ReporterInput!) {\n  createCellOutput(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}": types.CreateCellOutputDocument,
    "mutation UnArchiveCellExecution($unArchiveCellExecutionId: String!) {\n  unArchiveCellExecution(id: $unArchiveCellExecutionId) {\n    id\n  }\n}": types.UnArchiveCellExecutionDocument,
    "mutation UpdateCellExecution($id: String!, $input: UpdateCellExecutionInput!) {\n  updateCellExecution(id: $id, input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}": types.UpdateCellExecutionDocument,
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
export function graphql(source: "mutation ArchiveCellExecution($archiveCellExecutionId: String!) {\n  archiveCellExecution(id: $archiveCellExecutionId) {\n    id\n  }\n}"): (typeof documents)["mutation ArchiveCellExecution($archiveCellExecutionId: String!) {\n  archiveCellExecution(id: $archiveCellExecutionId) {\n    id\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateCellExecution($input: CreateCellExecutionInput!) {\n  createCellExecution(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"): (typeof documents)["mutation CreateCellExecution($input: CreateCellExecutionInput!) {\n  createCellExecution(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateCellOutput($input: ReporterInput!) {\n  createCellOutput(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"): (typeof documents)["mutation CreateCellOutput($input: ReporterInput!) {\n  createCellOutput(input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UnArchiveCellExecution($unArchiveCellExecutionId: String!) {\n  unArchiveCellExecution(id: $unArchiveCellExecutionId) {\n    id\n  }\n}"): (typeof documents)["mutation UnArchiveCellExecution($unArchiveCellExecutionId: String!) {\n  unArchiveCellExecution(id: $unArchiveCellExecutionId) {\n    id\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UpdateCellExecution($id: String!, $input: UpdateCellExecutionInput!) {\n  updateCellExecution(id: $id, input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"): (typeof documents)["mutation UpdateCellExecution($id: String!, $input: UpdateCellExecutionInput!) {\n  updateCellExecution(id: $id, input: $input) {\n    id\n    htmlUrl\n    exitCode\n    isSlackReady\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;