FROM ghcr.io/cryptosharks131/lndg:v1.11.1

# Upstream's Python CA bundle still contains the retired emSign root.
RUN python3 -m pip install --no-cache-dir --upgrade 'certifi>=2026.10.19' \
    && python3 -c 'from pathlib import Path; import certifi, sys; sys.exit(b"MIICTjCCAdOgAwIBAgIKPPYHqWhwDtqLhDAKBggqhkjOPQQDAzBr" in Path(certifi.where()).read_bytes())'

# arm64 or amd64
ARG PLATFORM
ARG YQ_VERSION
ARG YQ_SHA

RUN \
  # install yq
  wget -qO /tmp/yq https://github.com/mikefarah/yq/releases/download/v${YQ_VERSION}/yq_linux_${PLATFORM} && \
  echo "${YQ_SHA} /tmp/yq" | sha256sum -c - && \
  mv /tmp/yq /usr/local/bin/yq && chmod +x /usr/local/bin/yq

ADD ./docker_entrypoint.sh /usr/local/bin/docker_entrypoint.sh
RUN chmod a+x /usr/local/bin/*.sh
