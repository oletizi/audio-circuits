# The autorouter this repository drives (KiCadRoutingTools), pinned in krt.pin.
#
# `make krt` is a no-op once the engine under .tools/krt/ is built and its
# stamp agrees with krt.pin. All the work - clone, checkout, venv, Rust router
# build, stamp - is tools/krt/acquire.ts; this file only names the entry point.
# The commit it prints is read from the STAMP, never from krt.pin.

ifndef KRT_MK
KRT_MK := 1

KRT_REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))..)

.PHONY: krt

krt:
	@bun "$(KRT_REPO_ROOT)/tools/krt/acquire.ts"

endif
