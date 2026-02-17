import { createHandler } from 'graphql-http/lib/use/express';
import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLList, GraphQLNonNull } from 'graphql';

// Recursive type for testing nested depth
const EchoType: GraphQLObjectType = new GraphQLObjectType({
    name: 'Echo',
    fields: () => ({
        message: { type: GraphQLString },
        depth: { type: GraphQLInt },
        next: {
            type: EchoType,
            resolve: (parent) => {
                return {
                    message: parent.message,
                    depth: parent.depth + 1
                };
            }
        }
    })
});

const RootQuery = new GraphQLObjectType({
    name: 'Query',
    fields: {
        echo: {
            type: EchoType,
            args: {
                message: { type: GraphQLString }
            },
            resolve: (_, args) => ({
                message: args.message || 'Hello GraphQL',
                depth: 1
            })
        },
        // Introspection-heavy field
        complexData: {
            type: GraphQLString,
            resolve: () => "This is some data"
        }
    }
});

const schema = new GraphQLSchema({
    query: RootQuery
});

export const graphqlHandler = createHandler({ schema });
