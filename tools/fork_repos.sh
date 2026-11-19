#!/bin/zsh
# usage: fork.sh fork_list.tsv fork_log.tsv
LIST=$1; LOG=$2; touch $LOG
while IFS=$'\t' read -r src new fams; do
  grep -q "^$src	ok" $LOG && continue
  out=$(gh api -X POST "repos/$src/forks" -f organization=PehoejiFont -f name="$new" -F default_branch_only=true --jq .full_name 2>&1)
  if [[ $? -eq 0 ]]; then echo "$src	ok	$out" >> $LOG
  else
    echo "$src	fail	$(echo $out | tr '\n\t' '  ' | cut -c1-200)" >> $LOG
    if echo "$out" | grep -qiE 'secondary rate|abuse|rate limit'; then sleep 120; fi
  fi
  sleep 3
done < $LIST
echo DONE >> $LOG
