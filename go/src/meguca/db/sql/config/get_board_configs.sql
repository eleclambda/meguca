select readOnly, textOnly, forcedAnon, disableRobots, id, title, notice, rules,
		eightball
	from boards
	where id = $1
