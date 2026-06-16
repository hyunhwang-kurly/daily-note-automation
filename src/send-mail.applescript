-- Mail.app으로 HTML 메일 1통 발송. 인자: subject, address, textBody, htmlBody (셸 이스케이프 회피 위해 argv로 전달)
on run argv
	set theSubject to item 1 of argv
	set theAddress to item 2 of argv
	set theText to item 3 of argv
	set theHtml to item 4 of argv
	-- Mail 먼저 구동 (백그라운드 동기화로 인한 send 지연 방지)
	tell application "Mail" to launch
	tell application "Mail"
		set newMessage to make new outgoing message with properties {subject:theSubject, content:theText, visible:false}
		tell newMessage
			make new to recipient at end of to recipients with properties {address:theAddress}
		end tell
		-- HTML 본문 적용 (플레인 텍스트는 폴백으로 유지)
		set html content of newMessage to theHtml
		with timeout of 60 seconds
			send newMessage
		end timeout
	end tell
end run
