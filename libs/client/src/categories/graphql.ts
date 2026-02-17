/**
 * GraphQL API
 * GraphQL query execution endpoint
 */

import type { HttpClient } from '../http.js';
import type { GraphQLRequest, GraphQLResponse, GraphQLError } from '../types.js';

export class GraphQLApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Execute a GraphQL query
   * POST /graphql
   */
  async query<T = unknown>(request: GraphQLRequest): Promise<GraphQLResponse<T>> {
    return this.http.post<GraphQLResponse<T>>('/graphql', request);
  }

  /**
   * Execute a query with variables
   */
  async execute<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string
  ): Promise<GraphQLResponse<T>> {
    return this.query<T>({ query, variables, operationName });
  }

  /**
   * Execute query and return just the data (throws on errors)
   */
  async request<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await this.execute<T>(query, variables);

    if (response.errors && response.errors.length > 0) {
      throw new GraphQLQueryError(response.errors);
    }

    if (response.data === undefined) {
      throw new Error('GraphQL response contained no data');
    }

    return response.data;
  }

  /**
   * Get the GraphQL schema (introspection query)
   */
  async getSchema(): Promise<unknown> {
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
          directives {
            name
            description
            locations
            args {
              ...InputValue
            }
          }
        }
      }

      fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }

      fragment InputValue on __InputValue {
        name
        description
        type {
          ...TypeRef
        }
        defaultValue
      }

      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    return this.request(introspectionQuery);
  }

  /**
   * Get available query types
   */
  async getQueryTypes(): Promise<string[]> {
    const response = await this.execute<{ __schema: { queryType: { fields: { name: string }[] } } }>(`
      query {
        __schema {
          queryType {
            fields {
              name
            }
          }
        }
      }
    `);

    return response.data?.__schema.queryType.fields.map(f => f.name) ?? [];
  }

  /**
   * Echo query - echo back the request through GraphQL
   */
  async echo(path = '/'): Promise<unknown> {
    return this.request(`
      query Echo($path: String!) {
        echo(path: $path) {
          method
          path
          timestamp
          headers
        }
      }
    `, { path });
  }
}

/**
 * GraphQL query error with details
 */
export class GraphQLQueryError extends Error {
  constructor(public readonly errors: GraphQLError[]) {
    const message = errors.map(e => e.message).join('; ');
    super(`GraphQL Error: ${message}`);
    this.name = 'GraphQLQueryError';
  }

  get firstError(): GraphQLError {
    return this.errors[0];
  }
}
