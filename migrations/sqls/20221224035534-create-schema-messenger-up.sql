/* Replace with your SQL commands */
create extension moddatetime;
create schema messenger;


create table messenger.users (
	id uuid default gen_random_uuid(),
	name text not null,

	primary key (id),
	created_at timestamptz not null default current_timestamp,
	updated_at timestamptz not null default current_timestamp,
	unique (name)
);


-- The name cannot be schema-qualified — the trigger inherits the schema of its table.
create trigger messenger_users_moddatetime
	before update on messenger.users
	for each row
	execute procedure moddatetime(updated_at);


create table messenger.private_chats (
	id uuid default gen_random_uuid(),
	user1_id uuid not null,
	user2_id uuid not null,
	hash text generated always as (case
		when user1_id < user2_id then md5(user1_id::text || user2_id::text)
		else md5(user2_id::text || user1_id::text)
	end) stored,
	created_at timestamptz not null default current_timestamp,
	updated_at timestamptz not null default current_timestamp,

	primary key (id),
	unique(hash),
	foreign key (user1_id) references messenger.users(id),
	foreign key (user2_id) references messenger.users(id)
);

comment on column messenger.private_chats.hash is 'Hash is the combination of both user id in the chat, sorted and hashed to ensure uniqueness of the chat group.';


create trigger messenger_private_chats_moddatetime
	before update on messenger.private_chats
	for each row
	execute procedure moddatetime(updated_at);


create table messenger.private_chat_messages (
	id uuid default gen_random_uuid(),
	body text not null check (length(body) > 0),
	user_id uuid not null,
	private_chat_id uuid not null,
	created_at timestamptz not null default current_timestamp,
	updated_at timestamptz not null default current_timestamp,

	primary key (id),
	foreign key (private_chat_id) references messenger.private_chats(id),
	foreign key (user_id) references messenger.users(id)
);


create trigger messenger_private_chat_messages_moddatetime
	before update on messenger.private_chat_messages
	for each row
	execute procedure moddatetime(updated_at);


create table messenger.group_chats (
	id uuid default gen_random_uuid(),
	user_id uuid not null,
	created_at timestamptz not null default current_timestamp,
	updated_at timestamptz not null default current_timestamp,

	primary key (id),
	foreign key (user_id) references messenger.users(id)
);


create trigger messenger_group_chats_moddatetime
	before update on messenger.group_chats
	for each row
	execute procedure moddatetime(updated_at);


create table messenger.group_chat_participants (
	id uuid default gen_random_uuid(),
	user_id uuid not null,
	group_chat_id uuid not null,
	created_at timestamptz not null default current_timestamp,
	updated_at timestamptz not null default current_timestamp,

	primary key (id),
	foreign key (user_id) references messenger.users(id),
	foreign key (group_chat_id) references messenger.group_chats(id),
	unique (user_id, group_chat_id)
);


create trigger messenger_group_chat_participants_moddatetime
	before update on messenger.group_chat_participants
	for each row
	execute procedure moddatetime(updated_at);


create table messenger.group_chat_messages (
	id uuid default gen_random_uuid(),
	body text not null check (length(body) > 0),
	user_id uuid not null,
	group_chat_id uuid not null,
	created_at timestamptz not null default current_timestamp,
	updated_at timestamptz not null default current_timestamp,

	primary key (id),
	foreign key (group_chat_id) references messenger.group_chats(id),
	foreign key (user_id) references messenger.users(id)
);


create trigger messenger_group_chat_messages_moddatetime
	before update on messenger.group_chat_messages
	for each row
	execute procedure moddatetime(updated_at);
