-- RON.app (Routine On) 진입점. 번들된 node로 설정 마법사(bin/setup.js)를 실행한다.
on run
	set myPosix to POSIX path of (path to me)
	set res to myPosix & "Contents/Resources/"
	set nodeBin to res & "node/bin/node"
	set entry to res & "app/bin/setup.js"
	try
		with timeout of 3600 seconds
			do shell script quoted form of nodeBin & " " & quoted form of entry
		end timeout
	on error errMsg number errNum
		if errNum is not -128 then
			display dialog "실행 중 문제가 발생했습니다:" & return & errMsg buttons {"확인"} default button "확인" with title "RON"
		end if
	end try
end run
