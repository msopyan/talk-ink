import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";

import { BiLogOut, BiMoon, BiPlus, BiUserPlus } from "react-icons/bi";
import { FiSettings } from "react-icons/fi";
import { MdClose } from "react-icons/md";
import cookies from "js-cookie";
import { useNavigate, useParams } from "react-router";
import OneSignal from "react-onesignal";

import ChannelButton from "components/Button/ChannelButton";
import IconButton from "components/Button/IconButton";
import WorkspaceButton from "components/Button/WorkspaceButton";
import Popup from "components/Popup/Popup";
import Menu from "components/Menu/Menu";
import MenuItem from "components/Menu/MenuItem";
import { useAppDispatch } from "hooks/useAppDispatch";
import Modal from "components/Modal/Modal";
import ChannelForm from "components/ChannelForm/ChannelForm";
import SidebarList from "./SidebarList";

import { kontenbase } from "lib/client";
import { Channel, CreateChannel, Workspace } from "types";
import { useAppSelector } from "hooks/useAppSelector";
import { logout } from "features/auth";
import {
  addChannel,
  deleteChannel,
  fetchChannels,
} from "features/channels/slice";
import EditChannelForm from "components/ChannelForm/EditChannelForm";
import { useToast } from "hooks/useToast";
import AddMembers from "components/Members/AddMembers";
import WorkspaceListButton from "components/Button/WorkspaceListButton";
import Divider from "components/Divider/Divider";
import SettingsModal from "components/SettingsModal/SettingsModal";
import { FaPlus } from "react-icons/fa";
import { updateWorkspace } from "features/workspaces";
import ChannelInfo from "components/ChannelForm/ChannelInfo";
import AddChannelMember from "components/ChannelForm/AddChannelMember";

type TProps = {
  isMobile: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
};

function SidebarComponent({
  isMobile,
  isSidebarOpen,
  setIsSidebarOpen,
}: TProps) {
  const auth = useAppSelector((state) => state.auth);
  const workspace = useAppSelector((state) => state.workspace);
  const channel = useAppSelector((state) => state.channel);
  const [showToast] = useToast();

  const params = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [modalLoading, setModalLoading] = useState(false);

  const [createChannelModal, setCreateChannelModal] = useState(false);
  const [editChannelModal, setEditChannelModal] = useState(false);
  const [channelInfoModal, setChannelInfoModal] = useState(false);
  const [leaveChannelModal, setLeaveChannelModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);

  const [selectedChannel, setSelectedChannel] = useState<
    Channel | null | undefined
  >(null);

  const workspaceData = useMemo(() => {
    return workspace.workspaces.find((data) => data._id === params.workspaceId);
  }, [workspace.workspaces, params.workspaceId]);

  const channelData: Channel[] = useMemo(() => {
    return channel.channels.filter((data) =>
      data.members.includes(auth.user._id)
    );
  }, [channel.channels, params.channelId]);
  const userId: string = auth.user._id;

  const handleLogout = async () => {
    try {
      await kontenbase.auth.logout();

      cookies.remove("token");
      OneSignal.removeExternalUserId();
      dispatch(logout());
      navigate("/login");
    } catch (error) {
      console.log("err", error);
      showToast({ message: `${error}` });
    }
  };

  const getChannels = () => {
    dispatch(fetchChannels({ userId, workspaceId: params.workspaceId }));
  };

  const createChannelHandler = async (values: CreateChannel) => {
    setModalLoading(true);
    try {
      const createChannel = await kontenbase.service("Channels").create({
        ...values,
        members: values?.members,
        workspace: params.workspaceId,
      });

      if (createChannel) {
        dispatch(addChannel(createChannel.data));
        dispatch(
          updateWorkspace({
            _id: params.workspaceId,
            channels: [...workspaceData.channels, createChannel?.data?._id],
          })
        );
        setCreateChannelModal(false);
        if (values?.members?.includes(auth.user._id)) {
          navigate(`/a/${params.workspaceId}/ch/${createChannel?.data?._id}`);
        }
      }
    } catch (error) {
      console.log("err", error);
      showToast({ message: `${error}` });
    } finally {
      setModalLoading(false);
    }
  };

  const leaveChannelHandler = async () => {
    try {
      let members = selectedChannel.members.filter((data) => data !== userId);

      await kontenbase.service("Channels").updateById(selectedChannel?._id, {
        members,
      });

      dispatch(deleteChannel(selectedChannel));
      setSelectedChannel(null);
      setLeaveChannelModal(false);
      navigate(`/a/${params.workspaceId}/inbox`);
    } catch (error) {
      console.log("err", error);
      showToast({ message: `${error}` });
    }
  };

  useEffect(() => {
    getChannels();
  }, [params.workspaceId]);

  const loading = workspace.loading || channel.loading;

  return (
    <div>
      <div
        className={
          isMobile
            ? `bg-[#F7FAFB] top-0 left-0 fixed h-full z-40  ease-in-out duration-300 ${
                isSidebarOpen
                  ? "translate-x-0 w-[80vw] "
                  : "-translate-x-full w-full"
              } md:block`
            : `bg-[#F7FAFB] h-screen hidden md:block relative z-[51] `
        }
      >
        <div className="bg-[#F7FAFB] w-full flex justify-between py-2 px-3 sticky top-0 z-[51]">
          <Popup
            content={
              <div>
                <Menu>
                  <div className="max-h-40 overflow-auto">
                    {workspace.workspaces.map((data, idx) => (
                      <WorkspaceListButton
                        key={idx}
                        data={data}
                        onClick={() => {
                          navigate(`/a/${data._id}/inbox`);
                        }}
                      />
                    ))}
                  </div>

                  <Divider />
                  <MenuItem
                    icon={<BiPlus size={20} className="text-neutral-400" />}
                    title="Create new workspace"
                    onClick={() => {
                      navigate("/a/create_workspace");
                    }}
                  />

                  <Divider />

                  <MenuItem
                    icon={<FiSettings size={20} className="text-neutral-400" />}
                    title="Settings & members"
                    onClick={() => {
                      setSettingsModal(true);
                    }}
                  />
                  <MenuItem
                    icon={<BiLogOut size={20} className="text-neutral-400" />}
                    title="Log Out"
                    onClick={handleLogout}
                  />
                </Menu>
              </div>
            }
            position={isMobile ? "bottom" : "right"}
          >
            {!loading && <WorkspaceButton workspaceData={workspaceData} />}
          </Popup>
          <IconButton>
            {isMobile ? (
              <MdClose
                size={18}
                className="text-neutral-400"
                onClick={() => setIsSidebarOpen(false)}
              />
            ) : (
              // <BiMoon size={18} className="text-neutral-400" />
              <></>
            )}
          </IconButton>
        </div>
        {!loading && (
          <div className="p-2">
            <ul className="mb-1">
              <SidebarList
                type="search"
                name="Search"
                link={`/a/${workspaceData?._id}/search`}
                setIsSidebarOpen={setIsSidebarOpen}
              />
              <SidebarList
                type="inbox"
                name="Inbox"
                link={`/a/${workspaceData?._id}/inbox`}
                setIsSidebarOpen={setIsSidebarOpen}
              />
              {/* <SidebarList
                type="saved"
                name="Saved"
                link={`/a/${workspaceData?._id}/saved`}
                setIsSidebarOpen={setIsSidebarOpen}
              />
              <SidebarList
                type="messages"
                name="Messages"
                link={`/a/${workspaceData?._id}/messages`}
                setIsSidebarOpen={setIsSidebarOpen}
              /> */}
            </ul>
            <ChannelButton onOptionClick={() => setCreateChannelModal(true)} />
            <div className="relative z-0">
              {channelData?.map((channel, idx) => (
                <SidebarList
                  setIsSidebarOpen={setIsSidebarOpen}
                  key={idx + channel._id}
                  type="channel"
                  name={channel.name}
                  data={channel}
                  link={`/a/${workspaceData?._id}/ch/${channel._id}`}
                  isDefault
                  count={channel.threads.length ?? 0}
                  leaveModalHandler={(channel) => {
                    setLeaveChannelModal(true);
                    setSelectedChannel(channel);
                  }}
                  editModalHandler={(channel) => {
                    setEditChannelModal(true);
                    setSelectedChannel(channel);
                  }}
                  channelInfoHandler={(channel) => {
                    setChannelInfoModal(true);
                    setSelectedChannel(channel);
                  }}
                  addMemberHandler={(channel) => {
                    setAddMemberModal(true);
                    setSelectedChannel(channel);
                  }}
                  isAdmin={
                    workspaceData.createdBy._id === auth.user._id ||
                    channel?.createdBy?._id === auth.user._id
                  }
                />
              ))}
              <div
                className="cursor-pointer w-full rounded hover:bg-neutral-100 flex items-center justify-between group mt-1"
                onClick={() => setCreateChannelModal(true)}
              >
                <div className=" `w-full flex items-center text-sm pl-3 h-8`">
                  <FaPlus size={15} className="mr-3 text-gray-400" />
                  <p className="max-w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">
                    New Channel
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Modal
        header="Create new channel"
        onClose={() => {
          setCreateChannelModal(false);
        }}
        visible={createChannelModal}
        footer={null}
        size="small"
      >
        <ChannelForm
          onSubmit={createChannelHandler}
          loading={modalLoading}
          onCancel={() => {
            setCreateChannelModal(false);
          }}
        />
      </Modal>
      <Modal
        header="Edit channel"
        visible={editChannelModal}
        onClose={() => {
          setEditChannelModal(false);
          setSelectedChannel(null);
        }}
        onCancel={() => {
          setEditChannelModal(false);
          setSelectedChannel(null);
        }}
        footer={null}
        size="small"
      >
        <EditChannelForm
          data={selectedChannel}
          onClose={() => {
            setEditChannelModal(false);
            setSelectedChannel(null);
          }}
        />
      </Modal>
      <Modal
        header="Channel information"
        visible={channelInfoModal}
        onClose={() => {
          setChannelInfoModal(false);
          setSelectedChannel(null);
        }}
        onCancel={() => {
          setChannelInfoModal(false);
          setSelectedChannel(null);
        }}
        footer={null}
        size="small"
      >
        <ChannelInfo
          data={selectedChannel}
          onClose={() => {
            setChannelInfoModal(false);
            setSelectedChannel(null);
          }}
        />
      </Modal>
      <Modal
        header="Manage members"
        visible={addMemberModal}
        onClose={() => {
          setAddMemberModal(false);
          setSelectedChannel(null);
        }}
        onCancel={() => {
          setAddMemberModal(false);
          setSelectedChannel(null);
        }}
        footer={null}
        size="small"
      >
        <AddChannelMember
          data={selectedChannel}
          onClose={() => {
            setAddMemberModal(false);
            setSelectedChannel(null);
          }}
        />
      </Modal>
      <Modal
        header={`Leave ${
          selectedChannel?.privacy === "private" ? "private" : "public"
        } channel?`}
        okButtonText="Leave channel"
        visible={!!selectedChannel && leaveChannelModal}
        onCancel={() => {
          setSelectedChannel(null);
          setLeaveChannelModal(false);
        }}
        onClose={() => {
          setSelectedChannel(null);
          setLeaveChannelModal(false);
        }}
        onConfirm={() => {
          leaveChannelHandler();
        }}
        size="xs"
      >
        <p className="text-sm">
          Are you sure you want to leave this channel? You can always join it
          again later.
        </p>
      </Modal>
      <SettingsModal
        footer={null}
        visible={settingsModal}
        onClose={() => {
          setSettingsModal(false);
        }}
      />
    </div>
  );
}

export default SidebarComponent;
