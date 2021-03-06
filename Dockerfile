FROM ubuntu:trusty

RUN rm /bin/sh && ln -s /bin/bash /bin/sh

ENV NODE_VERSIONS 0.12 4 5 6 7
ENV NVM_DIR $HOME/.nvm

COPY . .

RUN ./scripts/install-tools.sh

RUN ./scripts/node-matrix.sh ./scripts/install-node.sh

RUN ./scripts/node-matrix.sh \
  ./scripts/prepare.sh \
  ./scripts/lint.sh \
  ./scripts/test-unit.sh \
  ./scripts/test-e2e.sh
