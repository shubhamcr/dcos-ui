import { addErrorLoggingToSchema } from 'graphql-tools';
import koa from 'koa';
import graphQLHTTP from 'koa-graphql';
import mount from 'koa-mount';

import { Agents } from './api/agents/models';
import AgentsConnector from './api/agents/connectors';

import { Tasks } from './api/tasks/models';
import TasksConnector from './api/tasks/connectors';

import schema from './api';

// Just copy in cookie from browser for now
const authToken = 'dcos-acs-auth-cookie=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJleHAiOjE0NzgzNzcyMzAsInVpZCI6ImJvb3RzdHJhcHVzZXIifQ.R3wU1fg4VuhdIkStneJLbX7P4XFjYQO2AOf0eiAM0M2HfoIGaMEL_7APrMdP5i3WdoVlthaDVk9LhGPV7RC-uWyf1OXOwUMrkuH4-Cre4wjl3kmfpyySdQI6cX4O7hUXendsdxI-kMPMXy-v8clmP20Chy5gvXVfglvtOvTMwoY1U3dGb1tghOKRVqjTPDNPAylS7nh-Zyb-oJTfqRdHEu4rdEjJfcVinOYOF5xTMmVJZXiS90JCBZ4HQ9WnGK-lvyU5G3XEQ2MFH17UzfufYvgICZ5PYajPXu2VxKU0hoZowZL4R_TsQX7heJ8okNY-rzmf9KsN2Ps_5WwMuZTTPA';

const GRAPHQL_PORT = 4000;

// Expose a GraphQL endpoint
const graphQLServer = koa();

const logger = { log: (e) => console.error(e.stack) };

addErrorLoggingToSchema(schema, logger);

graphQLServer.use(function *(next) {
  if (this.query && this.query.length > 2000) {
    // Probably indicates someone trying to send an overly expensive query
    throw new Error('Query too large.');
  }
  // Set models to context. This will be passed to all resolvers.
  // This gives us a new Connector for each request. The Connector will
  // cache results over it's lifetime for this request only so we can
  // prevent multiple requests to the same backend.
  this.models = {
    Agents: new Agents({
      connector: new AgentsConnector({ authToken })
    }),
    Tasks: new Tasks({
      connector: new TasksConnector({ authToken })
    })
  };

  yield next;
});

graphQLServer.use(mount('/', graphQLHTTP({
  schema,
  pretty: true,
  graphiql: true
})));

graphQLServer.listen(GRAPHQL_PORT, () => console.log(
  `GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}`
));
