import { Container } from "@theme-ui/components";
import { Heading } from "@theme-ui/components";
import { Text } from "@theme-ui/components";
import Button from "../Button";
import { Flex } from "@theme-ui/components";
import { Box } from "@theme-ui/components";

// TODO data should come from Sanity?
const Prefooter = () => (
  <Container sx={{ pb: [5, 6] }}>
    <Box
      sx={{
        py: [72, 136],
        px: [24, 72],
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        color: "background",
        backgroundImage: "url(/img/prefooter-background.svg)",
        backgroundSize: "cover"
      }}
    >
      <Heading
        sx={{
          fontSize: ["32px", "72px"],
          mb: [3, 4]
        }}
      >
        Ready to get started?
      </Heading>
      <Text
        sx={{
          fontSize: ["16px", "18px"],
          mb: [4, 5],
          maxWidth: "700px",
          mx: "auto"
        }}
      >
        Create a free account instantly and start creating streams. You can also
        contact us to design a custom package for your business.
      </Text>
      <Flex
        sx={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: ["column", "row"]
        }}
      >
        <Button href="/register" sx={{ mr: [0, 2], mb: [2, 0] }} isLink>
          Sign up for free
        </Button>
        <Button
          href="/contact"
          variant="buttons.text"
          sx={{
            height: 44, // Match sibling button
            color: "background",
            bg: "rgba(255,255,255,0)",
            transition: "background-color .15s",
            "&:hover": {
              bg: "rgba(255,255,255,0.08)"
            }
          }}
          isLink
        >
          Contact sales
        </Button>
      </Flex>
    </Box>
  </Container>
);

export default Prefooter;
