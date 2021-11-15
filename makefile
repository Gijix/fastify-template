route:
	gulp route --name $(filter-out $@,$(MAKECMDGOALS))