# Repository-wide guard for the Tascam 38 amplifier-card analysis.
#
# INCLUDED ONLY BY THE ROOT Makefile, for the same reason as make/pultec.mk:
# the interface matrix is not a board. It is the single authority for the 50
# J101-J108 contacts (docs/tascam-38/interface-matrix.csv), and the validator
# refuses a missing, duplicated or extra contact, an unknown status, and a
# VERIFIED row without both traced endpoints and their evidence.

.PHONY: tascam-38-interface-valid

tascam-38-interface-valid:
	@python3 "$(REPO_ROOT)/tools/tascam-38/validate-interface.py" "$(REPO_ROOT)/docs/tascam-38/interface-matrix.csv"
